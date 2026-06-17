import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual')

const appBaseUrl = process.env.E2E_APP_BASE_URL || 'http://localhost:5173'
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1'
const username = process.env.E2E_USER || 'demo'
const password = process.env.E2E_PASSWORD || 'demo1234'

function ensureVisualDir() {
  fs.mkdirSync(visualDir, { recursive: true })
}

async function login() {
  if (process.env.E2E_AUTH_TOKEN) {
    return {
      token: process.env.E2E_AUTH_TOKEN,
      user: {
        username,
        displayName: 'demo',
        role: 'USER',
      },
    }
  }

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      clientType: 'USER_WEB',
      deviceId: `e2e-asset-reuse-${Date.now()}`,
    }),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Login failed: HTTP ${response.status} ${text}`)
  }
  const payload = JSON.parse(text)
  if (payload.code !== 0 || !payload.data) {
    throw new Error(`Login failed: ${payload.message || text}`)
  }
  const data = payload.data
  return {
    token: data.accessToken || data.token,
    user: {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      creditBalance: data.creditBalance,
      creditFrozenBalance: data.creditFrozenBalance,
      creditTotalConsumed: data.creditTotalConsumed,
    },
  }
}

async function waitForVehicleBundle(page) {
  await page.waitForSelector('.asset-reuse-redesign', { timeout: 30000 })
  await page.waitForFunction(() => {
    return document.querySelectorAll('.asset-material-grid--packages .vehicle-bundle-card').length > 0
      || Boolean(document.querySelector('.asset-material-grid--packages .material-empty'))
  }, null, { timeout: 30000 })
  const count = await page.locator('.asset-material-grid--packages .vehicle-bundle-card').count()
  if (count <= 0) {
    throw new Error('No vehicle bundle card found on asset reuse page')
  }
  return count
}

async function assertPlanDrawer(page) {
  await page.waitForSelector('.ai-plan-drawer', { timeout: 30000 })
  await page.waitForSelector('.ai-plan-script-card textarea', { timeout: 30000 })
  await page.waitForFunction(() => {
    const drawer = document.querySelector('.ai-plan-drawer')
    const textarea = document.querySelector('.ai-plan-script-card textarea')
    const shots = document.querySelectorAll('.ai-plan-storyboard article')
    return Boolean(drawer)
      && Boolean(textarea)
      && textarea.value.trim().length > 0
      && shots.length > 0
  }, null, { timeout: 30000 })
}

async function run() {
  ensureVisualDir()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    deviceScaleFactor: 1,
  })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
    window.localStorage.removeItem('huashuo.assetReuseDraft.v1')
  }, auth)

  const page = await context.newPage()
  await page.goto(`${appBaseUrl}/asset-reuse`, { waitUntil: 'domcontentloaded' })
  const vehicleBundleCount = await waitForVehicleBundle(page)

  const firstBundle = page.locator('.asset-material-grid--packages .vehicle-bundle-card').first()
  const firstBundleTitle = (await firstBundle.locator('.vehicle-bundle-body strong').textContent())?.trim() || ''
  const hasBundleCover = await firstBundle.locator('.vehicle-bundle-preview img').count() > 0
  await firstBundle.click()

  await page.waitForSelector('.selection-item', { timeout: 10000 })
  const selectedCount = await page.locator('.selection-item').count()
  const hasPreviewImage = await page.locator('.video-preview-frame img').count() > 0

  await page.locator('.draft-prompt textarea').fill('面向家庭用户，突出空间舒适、出行轻松和到店试驾权益。')
  await page.locator('.selection-submit').click()
  await assertPlanDrawer(page)

  const screenshotPath = path.join(visualDir, 'asset-reuse-e2e.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })

  const report = {
    generatedAt: new Date().toISOString(),
    url: `${appBaseUrl}/asset-reuse`,
    status: 'ok',
    vehicleBundleCount,
    firstBundleTitle,
    hasBundleCover,
    selectedCount,
    hasPreviewImage,
    screenshotPath,
  }
  fs.writeFileSync(path.join(visualDir, 'asset-reuse-e2e-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
