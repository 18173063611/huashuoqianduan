import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')

const appBaseUrl = process.env.TUTORIAL_APP_BASE_URL || 'https://kcpq.site'
const apiBaseUrl = process.env.TUTORIAL_API_BASE_URL || `${appBaseUrl.replace(/\/$/, '')}/api/v1`
const username = process.env.TUTORIAL_USER || 'demo'
const password = process.env.TUTORIAL_PASSWORD || 'demo1234'
const outputDir = process.env.TUTORIAL_SCREENSHOT_DIR || path.join(projectRoot, 'public', 'tutorial', 'screenshots')
const docOutputDir = process.env.TUTORIAL_DOC_SCREENSHOT_DIR || path.join(repoRoot, '交付文档', 'assets', 'screenshots')

const viewport = { width: 2560, height: 1440 }

function ensureDirs() {
  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(docOutputDir, { recursive: true })
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      clientType: 'USER_WEB',
      deviceId: `tutorial-screenshot-${Date.now()}`,
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

async function settle(page, timeout = 1200) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(timeout)
}

async function saveScreenshot(page, fileName, options = {}) {
  const filePath = path.join(outputDir, fileName)
  const docFilePath = path.join(docOutputDir, fileName)
  const locator = options.selector ? page.locator(options.selector).first() : null
  if (locator && (await locator.count())) {
    await locator.screenshot({ path: filePath })
  } else {
    await page.screenshot({ path: filePath, fullPage: Boolean(options.fullPage) })
  }
  fs.copyFileSync(filePath, docFilePath)
  return filePath
}

function cropPngTop(sourceFileName, outputFileName, heightRatio = 1.45) {
  const sourcePath = path.join(outputDir, sourceFileName)
  const targetPath = path.join(outputDir, outputFileName)
  const source = PNG.sync.read(fs.readFileSync(sourcePath))
  const cropHeight = Math.min(source.height, Math.max(1, Math.round(source.width * heightRatio)))
  const cropped = new PNG({ width: source.width, height: cropHeight })
  PNG.bitblt(source, cropped, 0, 0, source.width, cropHeight, 0, 0)
  fs.writeFileSync(targetPath, PNG.sync.write(cropped))
  fs.copyFileSync(targetPath, path.join(docOutputDir, outputFileName))
  return targetPath
}

async function goto(page, route) {
  await page.goto(`${appBaseUrl.replace(/\/$/, '')}${route}`, { waitUntil: 'domcontentloaded' })
  await settle(page)
}

async function run() {
  ensureDirs()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale: 'zh-CN',
  })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
  }, auth)

  const page = await context.newPage()
  const outputs = []

  await page.goto(`${appBaseUrl.replace(/\/$/, '')}/login`, { waitUntil: 'domcontentloaded' })
  await settle(page)
  outputs.push(await saveScreenshot(page, 'login.png', { selector: '.auth-shell' }))

  await goto(page, '/render')
  outputs.push(await saveScreenshot(page, 'dashboard.png'))
  outputs.push(await saveScreenshot(page, 'create-video.png', { selector: '.quick-compose-card' }))
  outputs.push(await saveScreenshot(page, 'selling-point-templates.png', { selector: '.selling-point-template-strip' }))
  outputs.push(await saveScreenshot(page, 'recent-results.png', { selector: '.quick-recent-panel' }))

  const advancedButton = page.getByRole('button', { name: /高级参数/ })
  if (await advancedButton.count()) {
    await advancedButton.first().click()
    await page.waitForSelector('.car-advanced-drawer', { timeout: 10000 }).catch(() => {})
    await settle(page, 600)
    outputs.push(await saveScreenshot(page, 'advanced-parameters.png', { selector: '.car-advanced-drawer' }))
    outputs.push(cropPngTop('advanced-parameters.png', 'advanced-parameters-top.png'))
    await page.keyboard.press('Escape').catch(() => {})
  }

  await goto(page, '/assets?tab=materials')
  outputs.push(await saveScreenshot(page, 'asset-center.png', { selector: '.asset-center-page' }))
  outputs.push(await saveScreenshot(page, 'asset-materials.png', { selector: '.asset-hub-tabs' }))

  await goto(page, '/asset-reuse')
  outputs.push(await saveScreenshot(page, 'asset-reuse.png', { selector: '.asset-reuse-redesign' }))

  await goto(page, '/video-parse?entry=creation')
  outputs.push(await saveScreenshot(page, 'benchmark-create.png', { selector: '.benchmark-redesign' }))

  await goto(page, '/my-videos')
  outputs.push(await saveScreenshot(page, 'task-center.png'))

  await browser.close()

  const manifest = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    viewport,
    deviceScaleFactor: 2,
    outputDir,
    docOutputDir,
    files: outputs.map((filePath) => path.relative(projectRoot, filePath).replace(/\\/g, '/')),
  }
  const manifestPath = path.join(outputDir, 'manifest.json')
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  fs.copyFileSync(manifestPath, path.join(docOutputDir, 'manifest.json'))
  console.log(JSON.stringify(manifest, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
