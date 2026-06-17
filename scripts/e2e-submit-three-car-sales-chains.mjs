import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')
const visualDir = path.join(projectRoot, 'visual')

const appBaseUrl = process.env.E2E_APP_BASE_URL || 'http://127.0.0.1:5173'
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1'
const username = process.env.E2E_USER || 'demo'
const password = process.env.E2E_PASSWORD || 'demo1234'
const benchmarkVideoPath =
  process.env.E2E_BENCHMARK_VIDEO ||
  path.join(repoRoot, '\u72ec\u7acb\u7ad9\u7d20\u6750', '\u603b\u6210\u54c1', '\u6377\u9014.mp4')
const monitorMinutes = Number(process.env.E2E_MONITOR_MINUTES || 18)

const submittedTaskIds = new Set()

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
      deviceId: `e2e-real-submit-${Date.now()}`,
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Login failed: HTTP ${response.status} ${text}`)
  const payload = JSON.parse(text)
  if (payload.code !== 0 || !payload.data) throw new Error(`Login failed: ${payload.message || text}`)
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
  if (!response.ok) throw new Error(`GET ${pathname} failed: HTTP ${response.status} ${text}`)
  const payload = JSON.parse(text)
  if (payload.code !== 0) throw new Error(`GET ${pathname} failed: ${payload.message || text}`)
  return payload.data
}

async function seedAuth(context, auth) {
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
    window.localStorage.removeItem('huashuo.assetReuseDraft.v1')
  }, auth)
}

async function selectFirstCarBundleFromDrawer(page) {
  await page.waitForSelector('.car-asset-drawer', { timeout: 45000 })
  const navCount = await page.locator('.car-asset-nav button').count()
  if (navCount > 0) await page.locator('.car-asset-nav button').first().click()
  const scopeSelect = page.locator('.car-asset-toolbar select').first()
  if ((await scopeSelect.count()) > 0) {
    await scopeSelect.selectOption('all').catch(() => {})
    await page.locator('.car-asset-toolbar .car-asset-button').click().catch(() => {})
  }
  await page.waitForFunction(() => document.querySelectorAll('.car-asset-card').length > 0, null, { timeout: 45000 })
  const firstCard = page.locator('.car-asset-card').first()
  const firstTitle = (await firstCard.locator('.car-asset-info strong').textContent())?.trim() || ''
  const hasCover = (await firstCard.locator('.car-asset-preview img').count()) > 0
  await firstCard.locator('.car-asset-primary').click()
  await page.waitForSelector('.car-asset-drawer', { state: 'detached', timeout: 15000 }).catch(() => {})
  return { firstTitle, hasCover }
}

async function waitForPlanDrawer(page) {
  await page.waitForSelector('.ai-plan-drawer', { timeout: 45000 })
  await page.waitForFunction(() => {
    const loading = document.querySelector('.ai-plan-loading')
    const textarea = document.querySelector('.ai-plan-script-card textarea')
    const shots = document.querySelectorAll('.ai-plan-storyboard article')
    const submit = document.querySelector('.ai-plan-footer .app-primary-button')
    return !loading && textarea && textarea.value.trim().length > 0 && shots.length > 0 && submit && !submit.disabled
  }, null, { timeout: 180000 })
  return page.evaluate(() => {
    const script = document.querySelector('.ai-plan-script-card textarea')?.value || ''
    const config = document.querySelector('.ai-plan-config-list')?.textContent || ''
    const metrics = document.querySelector('.ai-plan-metrics')?.textContent || ''
    return {
      scriptLength: script.trim().length,
      scriptPreview: script.trim().slice(0, 240),
      shotCount: document.querySelectorAll('.ai-plan-storyboard article').length,
      config,
      metrics,
      hasEnglishWords: /[A-Za-z]{4,}/.test(script),
      hasCjk: /[\u4E00-\u9FFF]/.test(script),
    }
  })
}

async function submitOpenPlan(page) {
  const responsePromise = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/video/quick-render') && response.request().method() === 'POST'
  }, { timeout: 120000 })
  await page.locator('.ai-plan-footer .app-primary-button').click()
  const response = await responsePromise
  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`quick-render returned non-JSON: HTTP ${response.status()} ${text.slice(0, 500)}`)
  }
  if (!response.ok() || payload.code !== 0) {
    throw new Error(`quick-render failed: HTTP ${response.status()} ${payload.message || text}`)
  }
  const data = payload.data || {}
  const task = data.task || data.digitalHumanTask?.task || data.digitalHumanTask || null
  const taskId = Number(task?.taskId || data.taskId || 0) || null
  if (taskId) submittedTaskIds.add(taskId)
  await page.waitForTimeout(1500)
  return {
    taskId,
    route: data.route || null,
    summary: data.summary || '',
    task,
    outputAsset: data.outputAsset || null,
    assetCount: Array.isArray(data.assets) ? data.assets.length : 0,
  }
}

async function runAiSmartChain(context) {
  const page = await context.newPage()
  await page.goto(`${appBaseUrl}/render`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.quick-compose-card', { timeout: 45000 })
  await page.locator('.quick-prompt-box textarea').fill(
    'Create a polished English SUV sales video for overseas buyers. Highlight family space, comfort, cargo capacity, smart cabin, outdoor lifestyle scenes, English voiceover, English subtitles, and a premium warm tone.',
  )
  await page.locator('.quick-control-field select').nth(1).selectOption('en-US')
  await page.locator('.quick-bundle-select').click()
  const bundle = await selectFirstCarBundleFromDrawer(page)

  await page.locator('.quick-drawer-button').click()
  await page.waitForSelector('.car-advanced-drawer', { timeout: 30000 })
  await page.locator('.car-segmented button').last().click()
  await page.locator('.car-advanced-section').nth(1).locator('select').first().selectOption('upload').catch(() => {})
  await page.locator('.car-advanced-section').nth(1).locator('textarea').fill(
    'Spacious cabin. Relaxed rear seats. More room for every family trip.',
  ).catch(() => {})
  await page.locator('.car-advanced-section').nth(3).locator('select').first().selectOption('bgm').catch(() => {})
  await page.locator('.car-advanced-footer .app-primary-button').click()
  await page.waitForSelector('.car-advanced-drawer', { state: 'detached', timeout: 15000 }).catch(() => {})

  await page.locator('.quick-generate-button').click()
  const plan = await waitForPlanDrawer(page)
  const screenshotPath = path.join(visualDir, 'real-submit-ai-smart-plan.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  const submit = await submitOpenPlan(page)
  await page.close()
  return { status: 'submitted', bundle, plan, submit, screenshotPath }
}

async function waitForBenchmarkUploadReady(page) {
  await page.waitForFunction(() => {
    const panel = Array.from(document.querySelectorAll('.upload-parse-panel')).find((item) => {
      const rect = item.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const button = panel?.querySelector('.primary-button')
    return Boolean(button && !button.disabled)
  }, null, { timeout: 180000 })
}

async function runBenchmarkChain(context) {
  if (!fs.existsSync(benchmarkVideoPath)) {
    throw new Error(`Benchmark video not found: ${benchmarkVideoPath}`)
  }
  const page = await context.newPage()
  await page.goto(`${appBaseUrl}/video-parse?entry=creation`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.benchmark-redesign', { timeout: 45000 })

  await page.locator('.benchmark-link-panel .source-tabs button:visible').nth(1).click()
  await page.locator('.upload-parse-panel:visible .video-upload-picker input[type=file]').setInputFiles(benchmarkVideoPath)
  await waitForBenchmarkUploadReady(page)
  await page.locator('.upload-parse-panel:visible .primary-button').click()
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('.result-title small')).some((item) =>
      (item.textContent || '').includes('\u89e3\u6790\u5b8c\u6210'),
    )
  }, null, { timeout: 360000 }).catch(() => {})

  await page.locator('.benchmark-ready-card .secondary-button').click()
  const bundle = await selectFirstCarBundleFromDrawer(page)
  const rewriteSelects = page.locator('.rewrite-style-select')
  if ((await rewriteSelects.count()) >= 2) {
    await rewriteSelects.nth(1).selectOption({ index: 1 }).catch(() => {})
  }
  await page.locator('.benchmark-ready-card .primary-button').click()
  const plan = await waitForPlanDrawer(page)
  const screenshotPath = path.join(visualDir, 'real-submit-benchmark-plan.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  const submit = await submitOpenPlan(page)
  await page.close()
  return { status: 'submitted', uploadedVideo: benchmarkVideoPath, bundle, plan, submit, screenshotPath }
}

async function runAssetReuseChain(context) {
  const page = await context.newPage()
  await page.goto(`${appBaseUrl}/asset-reuse`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.asset-reuse-redesign', { timeout: 45000 })
  await page.waitForFunction(() => document.querySelectorAll('.asset-material-grid--packages .vehicle-bundle-card').length > 0, null, { timeout: 45000 })
  const firstBundle = page.locator('.asset-material-grid--packages .vehicle-bundle-card').first()
  const firstTitle = (await firstBundle.locator('.vehicle-bundle-body strong').textContent())?.trim() || ''
  const hasCover = (await firstBundle.locator('.vehicle-bundle-preview img').count()) > 0
  await firstBundle.click()
  await page.waitForSelector('.selection-item', { timeout: 15000 })
  await page.locator('.draft-prompt textarea').fill(
    'Create a complete English sales video for overseas SUV customers. Use English voiceover, English subtitles, public road and family outdoor scenes, warm premium BGM, digital human appearance if available, and a clear test-drive call to action.',
  )
  await page.locator('.selection-submit').click()
  const plan = await waitForPlanDrawer(page)
  const screenshotPath = path.join(visualDir, 'real-submit-asset-reuse-plan.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  const submit = await submitOpenPlan(page)
  await page.close()
  return {
    status: 'submitted',
    bundle: { firstTitle, hasCover },
    plan,
    submit,
    screenshotPath,
  }
}

async function latestGenerationTasks(token) {
  const tasks = await apiGet('/tasks?pageNo=1&pageSize=30', token)
  return (Array.isArray(tasks) ? tasks : []).filter((task) =>
    ['QUICK_RENDER', 'SEEDANCE_CAR_SALES_VIDEO', 'DIGITAL_HUMAN_GENERATE'].includes(String(task.taskType || '')),
  )
}

function extractExtraTaskIdsFromTask(task) {
  const ids = []
  for (const raw of [task?.inputJson, task?.outputJson]) {
    if (!raw || typeof raw !== 'string') continue
    const matches = raw.match(/"taskId"\s*:\s*(\d+)/g) || []
    for (const match of matches) {
      const id = Number(match.match(/(\d+)/)?.[1])
      if (id) ids.push(id)
    }
  }
  return ids
}

async function monitorTasks(token) {
  const deadline = Date.now() + Math.max(1, monitorMinutes) * 60 * 1000
  let seen = new Map()
  while (Date.now() < deadline) {
    const ids = Array.from(submittedTaskIds)
    const details = []
    for (const id of ids) {
      const task = await apiGet(`/tasks/${id}`, token).catch((error) => ({ taskId: id, status: 'QUERY_FAILED', errorMessage: error.message }))
      details.push(task)
      for (const extraId of extractExtraTaskIdsFromTask(task)) submittedTaskIds.add(extraId)
    }
    for (const task of await latestGenerationTasks(token).catch(() => [])) {
      if (submittedTaskIds.has(task.taskId)) details.push(task)
    }
    seen = new Map(details.map((task) => [task.taskId, task]))
    const active = Array.from(seen.values()).some((task) => ['QUEUED', 'RUNNING', 'RETRYABLE'].includes(String(task.status || '').toUpperCase()))
    if (!active && seen.size >= submittedTaskIds.size) break
    await new Promise((resolve) => setTimeout(resolve, 15000))
  }
  return Array.from(seen.values()).sort((a, b) => Number(a.taskId || 0) - Number(b.taskId || 0))
}

async function main() {
  ensureVisualDir()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    deviceScaleFactor: 1,
  })
  await seedAuth(context, auth)

  const report = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    apiBaseUrl,
    user: { userId: auth.user.userId, username: auth.user.username, creditBalance: auth.user.creditBalance },
    chains: {},
    submittedTaskIds: [],
    monitoredTasks: [],
  }

  report.chains.aiSmart = await runAiSmartChain(context)
  report.chains.benchmark = await runBenchmarkChain(context)
  report.chains.assetReuse = await runAssetReuseChain(context)
  report.submittedTaskIds = Array.from(submittedTaskIds)
  report.monitoredTasks = await monitorTasks(auth.token)
  report.status = Object.values(report.chains).every((item) => item.status === 'submitted') ? 'submitted' : 'needs-work'

  await browser.close()
  const reportPath = path.join(visualDir, 'real-submit-three-car-sales-chains-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
