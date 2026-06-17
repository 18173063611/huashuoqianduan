import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual')

const viewport = { width: 1920, height: 1080 }
const appBaseUrl = process.env.VISUAL_APP_BASE_URL || 'http://localhost:5173'
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1'
const demoUsername = process.env.VISUAL_USER || 'demo'
const demoPassword = process.env.VISUAL_PASSWORD || 'demo1234'

const pages = [
  {
    key: 'benchmark-create',
    label: '爆款对标创作',
    url: process.env.VISUAL_BENCHMARK_URL || `${appBaseUrl}/video-parse?entry=creation`,
    rootSelector: '.benchmark-redesign',
    readySelectors: ['.benchmark-input-stage', '.benchmark-ready-card'],
    screenshotName: 'benchmark-create-regression.png',
  },
  {
    key: 'asset-reuse',
    label: '资产复用创作',
    url: process.env.VISUAL_ASSET_REUSE_URL || `${appBaseUrl}/asset-reuse`,
    rootSelector: '.asset-reuse-redesign',
    readySelectors: ['.vehicle-bundle-card', '.material-empty'],
    screenshotName: 'asset-reuse-regression.png',
  },
]

function ensureVisualDir() {
  fs.mkdirSync(visualDir, { recursive: true })
}

async function login() {
  if (process.env.VISUAL_AUTH_TOKEN) {
    return {
      token: process.env.VISUAL_AUTH_TOKEN,
      user: {
        username: demoUsername,
        displayName: '演示用户',
        role: 'USER',
      },
    }
  }

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: demoUsername,
      password: demoPassword,
      clientType: 'USER_WEB',
      deviceId: `visual-creative-${Date.now()}`,
    }),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`登录失败：HTTP ${response.status} ${text}`)
  }
  const payload = JSON.parse(text)
  if (payload.code !== 0) {
    throw new Error(`登录失败：${payload.message || text}`)
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

async function waitForAnySelector(page, selectors, timeout = 20000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      if ((await page.locator(selector).count()) > 0) {
        return selector
      }
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`等待页面就绪超时：${selectors.join(', ')}`)
}

function px(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}px` : '-'
}

function compactRect(rect) {
  if (!rect) return null
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  }
}

function maxAbs(values) {
  return Math.max(...values.filter((value) => typeof value === 'number').map((value) => Math.abs(value)), 0)
}

function makeCheck(item, status, detail) {
  return { item, status, detail }
}

function statusFromThreshold(value, ok, warn) {
  if (value <= ok) return 'ok'
  if (value <= warn) return 'warn'
  return 'needs-work'
}

function collectCommonChecks(metrics) {
  const overflow = Math.max(0, metrics.body.scrollWidth - metrics.viewport.width)
  const pageStartsAfterSidebar = metrics.root && metrics.sidebar
    ? metrics.root.x >= metrics.sidebar.width - 8
    : false

  return [
    makeCheck(
      '页面根节点',
      metrics.root ? 'ok' : 'needs-work',
      metrics.root ? `${px(metrics.root.width)} x ${px(metrics.root.height)}` : '未找到页面根节点',
    ),
    makeCheck(
      '横向溢出',
      statusFromThreshold(overflow, 4, 24),
      `scrollWidth ${px(metrics.body.scrollWidth)}，viewport ${px(metrics.viewport.width)}，溢出 ${px(overflow)}`,
    ),
    makeCheck(
      '左侧菜单保留',
      metrics.sidebar && pageStartsAfterSidebar ? 'ok' : 'warn',
      metrics.sidebar ? `菜单宽 ${px(metrics.sidebar.width)}，页面 x ${px(metrics.root?.x)}` : '未找到 .app-sidebar',
    ),
    makeCheck(
      '顶部全局入口',
      metrics.topbarActions ? 'ok' : 'warn',
      metrics.topbarActions ? `top ${px(metrics.topbarActions.y)}，right ${px(metrics.viewport.width - metrics.topbarActions.right)}` : '未找到 .app-topbar-actions',
    ),
  ]
}

function collectButtonChecks(metrics, scopeName) {
  const commandButtons = metrics.buttons.filter((button) => button.isCommandButton)
  if (!commandButtons.length) {
    return [makeCheck(`${scopeName}按钮`, 'warn', '未找到按钮')]
  }
  const heights = commandButtons.map((button) => button.height).filter(Boolean)
  const widths = commandButtons.map((button) => button.width).filter(Boolean)
  const heightSpread = Math.max(...heights) - Math.min(...heights)
  const largestWidth = Math.max(...widths)
  const largestHeight = Math.max(...heights)
  return [
    makeCheck(
      `${scopeName}按钮高度均衡`,
      statusFromThreshold(heightSpread, 8, 18),
      `高度范围 ${px(Math.min(...heights))} - ${px(largestHeight)}，差值 ${px(heightSpread)}`,
    ),
    makeCheck(
      `${scopeName}按钮尺寸克制`,
      largestWidth <= 360 && largestHeight <= 58 ? 'ok' : largestWidth <= 460 && largestHeight <= 72 ? 'warn' : 'needs-work',
      `最大按钮 ${px(largestWidth)} x ${px(largestHeight)}`,
    ),
  ]
}

function collectBenchmarkChecks(metrics) {
  const checks = []
  const contentCenter = metrics.root ? metrics.root.x + metrics.root.width / 2 : viewport.width / 2
  const titleCenter = metrics.title ? metrics.title.x + metrics.title.width / 2 : null
  const titleOffset = titleCenter == null ? null : Math.abs(titleCenter - contentCenter)
  checks.push(makeCheck(
    '标题居中',
    titleOffset == null ? 'warn' : statusFromThreshold(titleOffset, 60, 140),
    titleOffset == null ? '未找到标题' : `标题中心偏移 ${px(titleOffset)}`,
  ))

  if (metrics.inputStage && metrics.linkPanel && metrics.readyCard) {
    const panelHeightDiff = Math.abs(metrics.linkPanel.height - metrics.readyCard.height)
    const contentBottom = Math.max(metrics.linkPanel.bottom, metrics.readyCard.bottom)
    const stageBlankBottom = Math.max(0, metrics.inputStage.bottom - contentBottom)
    checks.push(makeCheck(
      '选择参考视频与生成准备高度',
      statusFromThreshold(panelHeightDiff, 50, 110),
      `左侧 ${px(metrics.linkPanel.height)}，右侧 ${px(metrics.readyCard.height)}，差值 ${px(panelHeightDiff)}`,
    ))
    checks.push(makeCheck(
      '输入区域底部留白',
      statusFromThreshold(stageBlankBottom, 56, 120),
      `底部留白 ${px(stageBlankBottom)}，输入卡片总高 ${px(metrics.inputStage.height)}`,
    ))
  } else {
    checks.push(makeCheck('输入卡片结构', 'warn', '未完整找到左侧输入卡片或右侧生成准备卡片'))
  }

  if (metrics.platformRow) {
    checks.push(makeCheck(
      '平台入口紧凑度',
      statusFromThreshold(metrics.platformRow.height, 64, 92),
      `平台行高度 ${px(metrics.platformRow.height)}`,
    ))
  }

  return [
    ...checks,
    ...collectButtonChecks(
      { buttons: metrics.buttons.filter((button) => button.inInputStage) },
      '爆款输入区',
    ),
  ]
}

function collectAssetReuseChecks(metrics) {
  const checks = []
  const railTopDelta = metrics.stageList && metrics.previewRail ? Math.abs(metrics.stageList.y - metrics.previewRail.y) : null
  checks.push(makeCheck(
    '主内容与方案预览对齐',
    railTopDelta == null ? 'warn' : statusFromThreshold(railTopDelta, 24, 72),
    railTopDelta == null ? '未找到主内容或右侧预览' : `顶部差值 ${px(railTopDelta)}`,
  ))

  checks.push(makeCheck(
    '车型素材包展示',
    metrics.vehicleBundleCount > 0 ? 'ok' : metrics.hasVehicleEmptyState ? 'warn' : 'needs-work',
    metrics.vehicleBundleCount > 0
      ? `当前展示 ${metrics.vehicleBundleCount} 个车型素材包`
      : metrics.hasVehicleEmptyState
        ? '未取到车型素材包，但保留空态'
        : '未找到车型素材包卡片或空态',
  ))

  const titleOverflow = metrics.overflowingTexts.filter((item) => item.selector.includes('vehicle-bundle')).length
  checks.push(makeCheck(
    '车型素材包文字截断',
    titleOverflow === 0 ? 'ok' : titleOverflow <= 2 ? 'warn' : 'needs-work',
    titleOverflow === 0 ? '未发现车型素材包标题溢出' : `${titleOverflow} 处标题可能溢出`,
  ))

  return [
    ...checks,
    ...collectButtonChecks(
      { buttons: metrics.buttons.filter((button) => button.inAssetReuse) },
      '资产复用页',
    ),
  ]
}

function collectChecks(pageConfig, metrics) {
  const common = collectCommonChecks(metrics)
  const pageChecks = pageConfig.key === 'benchmark-create'
    ? collectBenchmarkChecks(metrics)
    : collectAssetReuseChecks(metrics)
  return [...common, ...pageChecks]
}

function summarize(checks) {
  if (checks.some((check) => check.status === 'needs-work')) return 'needs-work'
  if (checks.some((check) => check.status === 'warn')) return 'warn'
  return 'ok'
}

async function measurePage(page, pageKey) {
  const pageSelectors = {
    key: pageKey,
    rootSelector: pageKey === 'benchmark-create' ? '.benchmark-redesign' : '.asset-reuse-redesign',
    headSelector: pageKey === 'benchmark-create' ? '.benchmark-redesign-head' : '.asset-reuse-head',
  }
  return page.evaluate((selectors) => {
    const rectOf = (selector) => {
      const el = document.querySelector(selector)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      }
    }
    const rootSelector = selectors.rootSelector
    const root = document.querySelector(rootSelector)
    const buttons = [...document.querySelectorAll('button, .el-button')]
      .map((el) => {
        const rect = el.getBoundingClientRect()
        const className = typeof el.className === 'string' ? el.className : ''
        const isMenuButton = Boolean(el.closest('.app-sidebar') || el.closest('.app-topbar-actions') || el.closest('.task-dock-fab'))
        const isChoiceButton = Boolean(el.closest('.asset-source-tabs, .asset-type-tabs, .platform-tabs, .reuse-choice-card, .upload-tile, .vehicle-bundle-card'))
        const isLinkButton = className.includes('link-action') || className.includes('preview-item')
        const isPrimaryOrSecondary = className.includes('primary-button') || className.includes('secondary-button')
        const isElementCommand = className.includes('el-button') && !isChoiceButton
        const isCommandButton = !isMenuButton && !isChoiceButton && !isLinkButton && (isPrimaryOrSecondary || isElementCommand)
        return {
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          className,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          inInputStage: Boolean(el.closest('.benchmark-input-stage')),
          inAssetReuse: Boolean(el.closest('.asset-reuse-redesign')),
          isCommandButton,
        }
      })
      .filter((button) => button.visible)

    const overflowingTexts = [...document.querySelectorAll('.vehicle-bundle-card strong, .vehicle-bundle-card span, .reuse-choice-card strong')]
      .map((el) => ({
        selector: el.closest('.vehicle-bundle-card') ? 'vehicle-bundle-card' : 'reuse-choice-card',
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }))
      .filter((item) => item.scrollWidth > item.clientWidth + 2)

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      body: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      root: rectOf(rootSelector),
      sidebar: rectOf('.app-sidebar'),
      topbarActions: rectOf('.app-topbar-actions'),
      title: rectOf(`${rootSelector} h1`),
      head: rectOf(selectors.headSelector),
      inputStage: rectOf('.benchmark-input-stage'),
      linkPanel: rectOf('.benchmark-link-panel'),
      readyCard: rectOf('.benchmark-ready-card'),
      platformRow: rectOf('.redesign-platforms'),
      stageList: rectOf('.asset-stage-list'),
      previewRail: rectOf('.asset-preview-rail'),
      materialGrid: rectOf('.asset-material-grid'),
      vehicleBundleCount: document.querySelectorAll('.asset-material-grid--packages .vehicle-bundle-card').length,
      hasVehicleEmptyState: Boolean(document.querySelector('.asset-material-grid--packages .material-empty')),
      buttons,
      overflowingTexts,
      titleText: (root?.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  }, pageSelectors).then((metrics) => {
    return {
      ...metrics,
      root: compactRect(metrics.root),
      sidebar: compactRect(metrics.sidebar),
      topbarActions: compactRect(metrics.topbarActions),
      title: compactRect(metrics.title),
      head: compactRect(metrics.head),
      inputStage: compactRect(metrics.inputStage),
      linkPanel: compactRect(metrics.linkPanel),
      readyCard: compactRect(metrics.readyCard),
      platformRow: compactRect(metrics.platformRow),
      stageList: compactRect(metrics.stageList),
      previewRail: compactRect(metrics.previewRail),
      materialGrid: compactRect(metrics.materialGrid),
      buttons: metrics.buttons.map((button) => ({
        ...button,
        x: Math.round(button.x),
        y: Math.round(button.y),
        width: Math.round(button.width),
        height: Math.round(button.height),
      })),
    }
  })
}

function printPageReport(pageReport) {
  console.log(`\n${pageReport.label}：${pageReport.status}`)
  console.log(`截图：${pageReport.screenshotPath}`)
  for (const check of pageReport.checks) {
    console.log(`- [${check.status}] ${check.item}：${check.detail}`)
  }
}

async function main() {
  ensureVisualDir()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
  }, auth)

  const reports = []
  for (const pageConfig of pages) {
    const page = await context.newPage()
    await page.goto(pageConfig.url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(pageConfig.rootSelector, { timeout: 30000 })
    await waitForAnySelector(page, pageConfig.readySelectors, 30000)
    await page.waitForTimeout(1200)

    const screenshotPath = path.join(visualDir, pageConfig.screenshotName)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    const metrics = await measurePage(page, pageConfig.key)
    const checks = collectChecks(pageConfig, metrics)
    const pageReport = {
      key: pageConfig.key,
      label: pageConfig.label,
      url: pageConfig.url,
      screenshotPath,
      status: summarize(checks),
      checks,
      metrics,
    }
    reports.push(pageReport)
    await page.close()
    printPageReport(pageReport)
  }

  await browser.close()

  const report = {
    generatedAt: new Date().toISOString(),
    viewport,
    pages: reports,
    status: summarize(reports.flatMap((item) => item.checks)),
  }
  const reportPath = path.join(visualDir, 'creative-pages-visual-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`\n视觉回归报告：${reportPath}`)

  const hardFailures = reports.flatMap((item) => item.checks).filter((check) => check.status === 'needs-work')
  if (hardFailures.length > 0 && process.env.VISUAL_FAIL_ON_WARNINGS === '1') {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
