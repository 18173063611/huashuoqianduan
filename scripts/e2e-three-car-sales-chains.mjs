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
const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, '')
const username = process.env.E2E_USER || 'demo'
const password = process.env.E2E_PASSWORD || 'demo1234'
const sceneAssetGroup = '\u6c7d\u8f66\u9500\u552e\u573a\u666f-GPTImage2'

function ensureVisualDir() {
  fs.mkdirSync(visualDir, { recursive: true })
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      clientType: 'USER_WEB',
      deviceId: `e2e-three-chains-${Date.now()}`,
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

async function apiGet(pathname, token) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`GET ${pathname} failed: HTTP ${response.status} ${text}`)
  }
  const payload = JSON.parse(text)
  if (payload.code !== 0) {
    throw new Error(`GET ${pathname} failed: ${payload.message || text}`)
  }
  return payload.data
}

function toPublicUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`
}

async function verifySceneAssets(token) {
  const encodedGroup = encodeURIComponent(sceneAssetGroup)
  const assets = await apiGet(
    `/assets?scope=global&assetType=IMAGE&assetGroup=${encodedGroup}&pageSize=20&includePreview=false`,
    token,
  )
  if (!Array.isArray(assets) || assets.length < 6) {
    throw new Error(`Expected at least 6 public scene assets, got ${Array.isArray(assets) ? assets.length : 0}`)
  }
  const first = assets[0]
  const imageUrl = toPublicUrl(first.thumbnailUrl || first.fileUrl)
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Scene image is not reachable: HTTP ${imageResponse.status} ${imageUrl}`)
  }
  return {
    count: assets.length,
    firstAssetId: first.assetId,
    firstFileName: first.fileName,
    firstUrl: first.fileUrl,
  }
}

async function installAiMocks(page) {
  await page.route('**/api/v1/scripts/rewrite', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: {
          rewrittenText: [
            'Meet this SUV designed for real family travel.',
            'The spacious cabin, relaxed rear seats, and generous cargo room make every weekend easier.',
            'From city commutes to outdoor escapes, it gives you confident comfort in every scene.',
            'Book a test drive today and feel the difference for yourself.',
          ].join('\n'),
          scriptVersionId: 900001,
        },
      }),
    })
  })
  await page.route('**/api/v1/storyboards/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: {
          storyboard: [
            { index: 1, visual: 'Bright showroom hero shot with the SUV front profile.', narration: 'Meet this SUV designed for real family travel.', estDurationSec: 5 },
            { index: 2, visual: 'Rear seat and cabin comfort close-up.', narration: 'The spacious cabin and relaxed rear seats make every trip easier.', estDurationSec: 5 },
            { index: 3, visual: 'Cargo space and family outdoor loading scene.', narration: 'Generous cargo room is ready for weekend gear.', estDurationSec: 5 },
          ],
        },
      }),
    })
  })
}

async function seedAuth(context, auth) {
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
    window.localStorage.removeItem('huashuo.assetReuseDraft.v1')
  }, auth)
}

async function selectFirstCarBundleFromDrawer(page) {
  await page.waitForSelector('.car-asset-drawer', { timeout: 30000 })
  const navCount = await page.locator('.car-asset-nav button').count()
  if (navCount > 0) {
    await page.locator('.car-asset-nav button').first().click()
  }
  await page.waitForFunction(() => document.querySelectorAll('.car-asset-card').length > 0, null, { timeout: 30000 })
  const firstTitle = (await page.locator('.car-asset-card .car-asset-info strong').first().textContent())?.trim() || ''
  const hasCover = await page.locator('.car-asset-card .car-asset-preview img').first().count() > 0
  await page.locator('.car-asset-card .car-asset-primary').first().click()
  await page.waitForSelector('.car-asset-drawer', { state: 'detached', timeout: 10000 }).catch(() => {})
  return { firstTitle, hasCover }
}

async function assertPlanDrawer(page) {
  await page.waitForSelector('.ai-plan-drawer', { timeout: 30000 })
  await page.waitForFunction(() => {
    const textarea = document.querySelector('.ai-plan-script-card textarea')
    const shots = document.querySelectorAll('.ai-plan-storyboard article')
    return Boolean(textarea && textarea.value.trim().length > 0 && shots.length > 0)
  }, null, { timeout: 30000 })
  return page.evaluate(() => {
    const script = document.querySelector('.ai-plan-script-card textarea')?.value || ''
    const config = document.querySelector('.ai-plan-config-list')?.textContent || ''
    const metrics = document.querySelector('.ai-plan-metrics')?.textContent || ''
    return {
      scriptLength: script.trim().length,
      shotCount: document.querySelectorAll('.ai-plan-storyboard article').length,
      config,
      metrics,
      hasEnglishWords: /Meet|SUV|family|test drive/i.test(script),
      hasCjk: /[\u4E00-\u9FFF]/.test(script),
    }
  })
}

async function runAiSmartChain(context) {
  const page = await context.newPage()
  await installAiMocks(page)
  await page.goto(`${appBaseUrl}/render`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.quick-compose-card', { timeout: 30000 })

  await page.locator('.quick-control-field select').nth(1).selectOption('en-US')
  await page.locator('.quick-bundle-select').click()
  const bundle = await selectFirstCarBundleFromDrawer(page)

  await page.waitForSelector('.quick-material--bundle', { timeout: 30000 })
  const selectedBundleHasImage = await page.locator('.quick-material--bundle img').count() > 0

  await page.locator('.quick-drawer-button').click()
  await page.waitForSelector('.car-advanced-drawer', { timeout: 30000 })
  await page.locator('.car-segmented button').last().click()
  await page.locator('.car-advanced-section').nth(1).locator('select').first().selectOption('upload')
  await page.locator('.car-advanced-section').nth(1).locator('textarea').fill(
    'Spacious cabin. Relaxed rear seats. More room for every family trip.',
  )
  await page.locator('.car-advanced-section').nth(3).locator('select').first().selectOption('bgm')
  await page.locator('.car-advanced-footer .app-primary-button').click()
  await page.waitForSelector('.car-advanced-drawer', { state: 'detached', timeout: 10000 }).catch(() => {})

  await page.locator('.quick-generate-button').click()
  const plan = await assertPlanDrawer(page)
  const screenshotPath = path.join(visualDir, 'three-chain-ai-smart.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await page.close()

  return {
    status: 'ok',
    bundle,
    selectedBundleHasImage,
    plan,
    screenshotPath,
  }
}

async function runBenchmarkChain(context) {
  const page = await context.newPage()
  await installAiMocks(page)
  await page.goto(`${appBaseUrl}/video-parse?entry=creation`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.benchmark-redesign', { timeout: 30000 })
  await page.waitForSelector('.benchmark-ready-card', { timeout: 30000 })

  await page.locator('.generate-confirm-card .benchmark-asset-bridge .secondary-button').click()
  const bundle = await selectFirstCarBundleFromDrawer(page)

  const selectedAssetCount = await page.locator('.benchmark-selected-assets span').count()
  const rewriteSelects = page.locator('.rewrite-style-select')
  if ((await rewriteSelects.count()) >= 2) {
    await rewriteSelects.nth(1).selectOption({ index: 1 }).catch(() => {})
  }
  await page.locator('.generate-confirm-card .primary-button').click()
  const plan = await assertPlanDrawer(page)
  const screenshotPath = path.join(visualDir, 'three-chain-benchmark.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await page.close()

  return {
    status: 'ok',
    bundle,
    selectedAssetCount,
    plan,
    screenshotPath,
  }
}

async function runAssetReuseChain(context) {
  const page = await context.newPage()
  await installAiMocks(page)
  await page.goto(`${appBaseUrl}/asset-reuse`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.asset-reuse-redesign', { timeout: 30000 })
  await page.waitForFunction(() => document.querySelectorAll('.asset-material-grid--packages .vehicle-bundle-card').length > 0, null, { timeout: 30000 })

  const firstBundle = page.locator('.asset-material-grid--packages .vehicle-bundle-card').first()
  const firstBundleTitle = (await firstBundle.locator('.vehicle-bundle-body strong').textContent())?.trim() || ''
  const hasBundleCover = await firstBundle.locator('.vehicle-bundle-preview img').count() > 0
  await firstBundle.click()

  await page.waitForSelector('.selection-item', { timeout: 10000 })
  await page.locator('.draft-prompt textarea').fill(
    'Create an English family SUV sales video. Use English voiceover, English subtitles, family outdoor scenes, and a warm premium tone.',
  )
  await page.locator('.selection-submit').click()
  const plan = await assertPlanDrawer(page)
  const selectedCount = await page.locator('.selection-item').count()
  const screenshotPath = path.join(visualDir, 'three-chain-asset-reuse.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await page.close()

  return {
    status: 'ok',
    bundle: {
      firstTitle: firstBundleTitle,
      hasCover: hasBundleCover,
    },
    selectedCount,
    plan,
    screenshotPath,
  }
}

async function main() {
  ensureVisualDir()
  const auth = await login()
  const sceneAssets = await verifySceneAssets(auth.token)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    deviceScaleFactor: 1,
  })
  await seedAuth(context, auth)

  const report = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    sceneAssets,
    chains: {
      aiSmart: await runAiSmartChain(context),
      benchmark: await runBenchmarkChain(context),
      assetReuse: await runAssetReuseChain(context),
    },
  }
  await browser.close()

  report.status = Object.values(report.chains).every((item) => item.status === 'ok') ? 'ok' : 'needs-work'
  const reportPath = path.join(visualDir, 'three-car-sales-chains-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
