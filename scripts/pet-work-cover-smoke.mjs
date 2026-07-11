import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual', 'pet-work-cover')
const appBaseUrl = process.env.PET_WORK_COVER_BASE_URL || 'http://127.0.0.1:5175'

const authUser = {
  userId: 90002,
  username: 'pet-work-cover-smoke',
  displayName: 'Pet Work Cover Smoke',
  role: 'ADMIN',
  status: 'ENABLED',
  permissions: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  features: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  creditBalance: 10000,
}

const works = [
  {
    id: 'cover-from-output-json',
    title: '封面来自 outputJson 的宠物作品',
    templateTitle: '多宠物对话',
    petType: 'cat',
    status: 'completed',
    aspectRatio: '9:16',
    durationSeconds: 15,
    videoUrl: '/media/pet-cover-test.mp4',
    outputJson: JSON.stringify({
      posterUrl: '/media/pet-poster-from-output.jpg',
    }),
    draft: { videoType: 'dialogue' },
    createdAt: '2026-07-10T12:00:00Z',
  },
  {
    id: 'video-frame-fallback',
    title: '只有视频地址的宠物作品',
    templateTitle: '人宠剧情',
    petType: 'dog',
    status: 'completed',
    aspectRatio: '16:9',
    durationSeconds: 8,
    videoUrl: '/media/pet-video-only.mp4',
    draft: { videoType: 'short_drama' },
    createdAt: '2026-07-10T12:01:00Z',
  },
]

const posterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="#f97316" offset="0"/>
      <stop stop-color="#2563eb" offset="1"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#g)"/>
  <circle cx="230" cy="250" r="96" fill="rgba(255,255,255,.24)"/>
  <text x="320" y="260" fill="white" font-family="Arial, sans-serif" font-size="52" font-weight="700">Pet Poster</text>
</svg>`

function ensureDir() {
  fs.mkdirSync(visualDir, { recursive: true })
}

function apiPayload(data, traceId = 'pet-work-cover-smoke') {
  return JSON.stringify({ code: 0, message: 'OK', data, traceId })
}

async function prepareContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  })

  await context.addInitScript((user) => {
    window.localStorage.setItem('huashuo_user_access_token', 'pet-work-cover-smoke-token')
    window.localStorage.setItem('huashuo_user', JSON.stringify(user))
  }, authUser)

  await context.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiPayload(authUser),
    })
  })

  await context.route('**/api/v1/tasks/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiPayload({ processingCount: 0, successCount: 0, failedCount: 0, records: [] }),
    })
  })

  await context.route('**/api/v1/pet-videos/works**', async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      throw new Error(`Pet work cover smoke must not call ${route.request().method()} ${route.request().url()}`)
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiPayload(works),
    })
  })

  await context.route('**/media/pet-poster-from-output.jpg', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: posterSvg,
    })
  })

  return context
}

function makeCheck(item, pass, detail) {
  return { item, status: pass ? 'ok' : 'needs-work', detail }
}

async function main() {
  ensureDir()
  const browser = await chromium.launch({ headless: true })
  const checks = []
  let screenshotPath = ''

  try {
    const context = await prepareContext(browser)
    const page = await context.newPage()
    const response = await page.goto(`${appBaseUrl}/pet-works`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector('.pet-work-card', { timeout: 30000 })
    await page.waitForTimeout(500)

    const metrics = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.pet-work-card')]
      const covers = cards.map((card) => card.querySelector('.pet-work-card-cover'))
      const firstCover = covers[0]
      const secondCover = covers[1]
      return {
        cardCount: cards.length,
        firstHasImage: firstCover?.classList.contains('has-image') || false,
        firstBackground: firstCover ? getComputedStyle(firstCover).backgroundImage : '',
        secondHasVideo: secondCover?.classList.contains('has-video') || false,
        secondVideoSrc: secondCover?.querySelector('video')?.getAttribute('src') || '',
        emptyPlaceholderCount: covers.filter((cover) => cover && !cover.classList.contains('has-image') && !cover.classList.contains('has-video')).length,
      }
    })

    checks.push(makeCheck('/pet-works returns 200', response?.status() === 200, `HTTP ${response?.status()}`))
    checks.push(makeCheck('works render as cards', metrics.cardCount >= 2, `cardCount=${metrics.cardCount}`))
    checks.push(makeCheck('outputJson poster is used as cover', metrics.firstHasImage && metrics.firstBackground.includes('pet-poster-from-output.jpg'), metrics.firstBackground))
    checks.push(makeCheck('video-only work renders metadata video fallback', metrics.secondHasVideo && metrics.secondVideoSrc.includes('pet-video-only.mp4'), metrics.secondVideoSrc))
    checks.push(makeCheck('no completed work falls back to blank gradient placeholder', metrics.emptyPlaceholderCount === 0, `emptyPlaceholderCount=${metrics.emptyPlaceholderCount}`))

    await page.locator('.pet-work-card').first().getByRole('button', { name: '预览', exact: true }).click()
    const previewModal = page.locator('.pet-work-preview-backdrop')
    await previewModal.waitFor({ state: 'visible', timeout: 5000 })
    const previewMetrics = await page.evaluate(() => {
      const modal = document.querySelector('.pet-work-preview-dialog')
      const video = modal?.querySelector('video')
      const rect = modal?.getBoundingClientRect()
      return {
        title: modal?.querySelector('h3')?.textContent || '',
        videoSrc: video?.getAttribute('src') || '',
        controls: video instanceof HTMLVideoElement ? video.controls : false,
        inViewport: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight + 1),
        bodyLocked: document.body.style.overflow === 'hidden',
      }
    })
    checks.push(makeCheck('preview click opens a viewport modal', previewMetrics.inViewport && previewMetrics.title.includes('封面来自'), JSON.stringify(previewMetrics)))
    checks.push(makeCheck('preview modal binds playable video', previewMetrics.videoSrc.includes('pet-cover-test.mp4') && previewMetrics.controls, previewMetrics.videoSrc))
    checks.push(makeCheck('preview modal locks page scroll', previewMetrics.bodyLocked, `bodyLocked=${previewMetrics.bodyLocked}`))

    screenshotPath = path.join(visualDir, 'pet-work-cover-smoke.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    await page.keyboard.press('Escape')
    checks.push(makeCheck('Escape closes preview modal', await previewModal.isHidden(), `hidden=${await previewModal.isHidden()}`))
    await context.close()
  } finally {
    await browser.close().catch(() => undefined)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    status: checks.some((check) => check.status === 'needs-work') ? 'needs-work' : 'ok',
    screenshotPath,
    checks,
  }
  const reportPath = path.join(visualDir, 'pet-work-cover-smoke-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (report.status !== 'ok') process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
