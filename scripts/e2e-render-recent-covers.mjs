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
      user: { username, displayName: 'demo', role: 'USER' },
    }
  }
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      clientType: 'USER_WEB',
      deviceId: `e2e-render-covers-${Date.now()}`,
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

async function run() {
  ensureVisualDir()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
  }, auth)

  const page = await context.newPage()
  await page.goto(`${appBaseUrl}/render`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.quick-recent-panel', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('.quick-recent-item:not(.quick-recent-item--placeholder)')]
    return cards.some((card) => {
      const src = card.querySelector('.quick-recent-thumb img')?.getAttribute('src') || ''
      return /^https?:\/\//i.test(src)
    })
  }, null, { timeout: 30000 })

  const rows = await page.$$eval('.quick-recent-item:not(.quick-recent-item--placeholder)', (cards) => cards.map((card) => {
    const title = card.querySelector('.quick-recent-main strong')?.textContent?.replace(/\s+/g, ' ').trim() || ''
    const meta = card.querySelector('.quick-recent-main p')?.textContent?.replace(/\s+/g, ' ').trim() || ''
    const imageUrl = card.querySelector('.quick-recent-thumb img')?.getAttribute('src') || ''
    const hasVideoLink = Boolean(card.querySelector('a.app-secondary-button'))
    const status = card.querySelector('.app-task-status')?.textContent?.replace(/\s+/g, ' ').trim() || ''
    return { title, meta, imageUrl, hasVideoLink, status }
  }))

  const realCoverRows = rows.filter((row) => /^https?:\/\//i.test(row.imageUrl))
  const placeholderRows = rows.filter((row) => row.imageUrl.includes('/src/assets/car.png'))
  const missingVideoRows = realCoverRows.filter((row) => !row.hasVideoLink)
  if (realCoverRows.length === 0) {
    throw new Error('No recent generation card uses a real asset cover URL')
  }
  if (placeholderRows.length > 0) {
    throw new Error(`Recent generation still contains placeholder covers: ${placeholderRows.map((row) => row.title).join(', ')}`)
  }
  if (missingVideoRows.length > 0) {
    throw new Error(`Recent generation cards have real covers but no video links: ${missingVideoRows.map((row) => row.title).join(', ')}`)
  }

  const screenshotPath = path.join(visualDir, 'render-recent-covers-e2e.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await browser.close()

  const report = {
    generatedAt: new Date().toISOString(),
    url: `${appBaseUrl}/render`,
    status: 'ok',
    realCoverCount: realCoverRows.length,
    rows,
    screenshotPath,
  }
  fs.writeFileSync(path.join(visualDir, 'render-recent-covers-e2e-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
