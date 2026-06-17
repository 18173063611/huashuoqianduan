import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')
const visualDir = path.join(projectRoot, 'visual')
const prototypeSource = path.join(repoRoot, '交付文档', 'images', 'car-sales-home-prototype.png')
const prototypePath = path.join(visualDir, 'prototype-render.png')
const currentPath = path.join(visualDir, 'current-render.png')
const reportPath = path.join(visualDir, 'render-visual-report.json')

const viewport = { width: 1920, height: 1080 }
const renderUrl = process.env.VISUAL_RENDER_URL || 'http://localhost:5173/render'
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1'
const demoUsername = process.env.VISUAL_USER || 'demo'
const demoPassword = process.env.VISUAL_PASSWORD || 'demo1234'

const prototypeReference = {
  note: '基于交付文档首页原型图人工标注，原图尺寸为 1600x1000；当前截图按要求固定 1920x1080。',
  sidebarWidth: 212,
  topbarActions: { top: 18, right: 20, height: 38 },
  mainContentStartX: 286,
  title: { top: 82, centerX: 800 },
  composeCard: { x: 286, y: 165, width: 1230, height: 351 },
  promptBox: { x: 302, y: 183, width: 1198, height: 118 },
  uploadCard: { width: 189, height: 108 },
  paramButton: { top: 428, height: 49 },
  generateButton: { width: 212, height: 49 },
  templateCard: { top: 572, width: 196, height: 130 },
  recentCard: { top: 760, width: 236, height: 201 },
}

function buildViewportReference(prototypeSize) {
  const scaleX = viewport.width / prototypeSize.width
  const scaleY = viewport.height / prototypeSize.height
  return {
    ...prototypeReference,
    note: `原型图实际尺寸 ${prototypeSize.width}x${prototypeSize.height}，主体区域按 1920x1080 等比换算；侧栏、上传卡片和按钮高度按固定控件口径比较。`,
    mainContentStartX: Math.round(prototypeReference.mainContentStartX * scaleX),
    title: {
      top: Math.round(prototypeReference.title.top * scaleY),
      centerX: Math.round(viewport.width / 2),
    },
    composeCard: {
      x: Math.round(prototypeReference.composeCard.x * scaleX),
      y: Math.round(prototypeReference.composeCard.y * scaleY),
      width: Math.round(prototypeReference.composeCard.width * scaleX),
      height: prototypeReference.composeCard.height,
    },
    promptBox: {
      x: Math.round(prototypeReference.promptBox.x * scaleX),
      y: Math.round(prototypeReference.promptBox.y * scaleY),
      width: Math.round(prototypeReference.promptBox.width * scaleX),
      height: prototypeReference.promptBox.height,
    },
    paramButton: {
      top: prototypeReference.paramButton.top,
      height: prototypeReference.paramButton.height,
    },
    templateCard: {
      top: Math.round(prototypeReference.templateCard.top * scaleY),
      width: Math.round(prototypeReference.templateCard.width * scaleX),
      height: prototypeReference.templateCard.height,
    },
    recentCard: {
      top: Math.round(prototypeReference.recentCard.top * scaleY),
      width: Math.round(prototypeReference.recentCard.width * scaleX),
      height: prototypeReference.recentCard.height,
    },
  }
}

function ensureVisualFiles() {
  fs.mkdirSync(visualDir, { recursive: true })
  if (!fs.existsSync(prototypePath)) {
    fs.copyFileSync(prototypeSource, prototypePath)
  }
}

function readPngSize(filePath) {
  const png = PNG.sync.read(fs.readFileSync(filePath))
  return { width: png.width, height: png.height }
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: demoUsername,
      password: demoPassword,
      clientType: 'USER_WEB',
      deviceId: `visual-render-${Date.now()}`,
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

function px(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}px` : '-'
}

function delta(current, expected) {
  if (current == null || expected == null) return null
  return Math.round(current - expected)
}

function grade(absDelta, ok, warn) {
  if (absDelta == null) return 'missing'
  const value = Math.abs(absDelta)
  if (value <= ok) return 'ok'
  if (value <= warn) return 'warn'
  return 'needs-work'
}

function buildDifferenceRows(metrics, reference) {
  const sidebar = metrics.sidebar
  const topbar = metrics.topbarActions
  const page = metrics.renderPage
  const title = metrics.title
  const compose = metrics.composeCard
  const prompt = metrics.promptBox
  const upload = metrics.uploadCard
  const control = metrics.firstControlField
  const generate = metrics.generateButton
  const template = metrics.templateCard
  const recent = metrics.recentCard

  const rows = [
    {
      item: '左侧导航宽度',
      prototype: px(reference.sidebarWidth),
      current: px(sidebar?.width),
      delta: delta(sidebar?.width, reference.sidebarWidth),
      status: grade(delta(sidebar?.width, reference.sidebarWidth), 12, 32),
    },
    {
      item: '顶部导航位置',
      prototype: `top ${px(reference.topbarActions.top)} / right ${px(reference.topbarActions.right)}`,
      current: topbar ? `top ${px(topbar.y)} / right ${px(viewport.width - topbar.right)}` : '-',
      delta: topbar ? {
        top: delta(topbar.y, reference.topbarActions.top),
        right: delta(viewport.width - topbar.right, reference.topbarActions.right),
      } : null,
      status: topbar ? grade(Math.max(Math.abs(topbar.y - reference.topbarActions.top), Math.abs((viewport.width - topbar.right) - reference.topbarActions.right)), 16, 40) : 'missing',
    },
    {
      item: '主内容起始位置',
      prototype: px(reference.mainContentStartX),
      current: px(page?.x),
      delta: delta(page?.x, reference.mainContentStartX),
      status: grade(delta(page?.x, reference.mainContentStartX), 32, 80),
    },
    {
      item: '标题位置',
      prototype: `top ${px(reference.title.top)} / centerX ${px(reference.title.centerX)}`,
      current: title ? `top ${px(title.y)} / centerX ${px(title.x + title.width / 2)}` : '-',
      delta: title ? {
        top: delta(title.y, reference.title.top),
        centerX: delta(title.x + title.width / 2, reference.title.centerX),
      } : null,
      status: title ? grade(Math.max(Math.abs(title.y - reference.title.top), Math.abs((title.x + title.width / 2) - reference.title.centerX)), 40, 120) : 'missing',
    },
    {
      item: '主卡片宽高',
      prototype: `${px(reference.composeCard.width)} x ${px(reference.composeCard.height)}`,
      current: compose ? `${px(compose.width)} x ${px(compose.height)}` : '-',
      delta: compose ? {
        width: delta(compose.width, reference.composeCard.width),
        height: delta(compose.height, reference.composeCard.height),
      } : null,
      status: compose ? grade(Math.max(Math.abs(compose.width - reference.composeCard.width), Math.abs(compose.height - reference.composeCard.height)), 80, 220) : 'missing',
    },
    {
      item: '输入框高度',
      prototype: px(reference.promptBox.height),
      current: px(prompt?.height),
      delta: delta(prompt?.height, reference.promptBox.height),
      status: grade(delta(prompt?.height, reference.promptBox.height), 14, 32),
    },
    {
      item: '上传卡片尺寸',
      prototype: `${px(reference.uploadCard.width)} x ${px(reference.uploadCard.height)}`,
      current: upload ? `${px(upload.width)} x ${px(upload.height)}` : '-',
      delta: upload ? {
        width: delta(upload.width, reference.uploadCard.width),
        height: delta(upload.height, reference.uploadCard.height),
      } : null,
      status: upload ? grade(Math.max(Math.abs(upload.width - reference.uploadCard.width), Math.abs(upload.height - reference.uploadCard.height)), 20, 48) : 'missing',
    },
    {
      item: '参数按钮位置',
      prototype: `top ${px(reference.paramButton.top)} / height ${px(reference.paramButton.height)}`,
      current: control ? `top ${px(control.y)} / height ${px(control.height)}` : '-',
      delta: control ? {
        top: delta(control.y, reference.paramButton.top),
        height: delta(control.height, reference.paramButton.height),
      } : null,
      status: control ? grade(Math.max(Math.abs(control.y - reference.paramButton.top), Math.abs(control.height - reference.paramButton.height)), 30, 80) : 'missing',
    },
    {
      item: '生成按钮尺寸',
      prototype: `${px(reference.generateButton.width)} x ${px(reference.generateButton.height)}`,
      current: generate ? `${px(generate.width)} x ${px(generate.height)}` : '-',
      delta: generate ? {
        width: delta(generate.width, reference.generateButton.width),
        height: delta(generate.height, reference.generateButton.height),
      } : null,
      status: generate ? grade(Math.max(Math.abs(generate.width - reference.generateButton.width), Math.abs(generate.height - reference.generateButton.height)), 18, 44) : 'missing',
    },
    {
      item: '推荐模板卡片尺寸',
      prototype: `${px(reference.templateCard.width)} x ${px(reference.templateCard.height)}`,
      current: template ? `${px(template.width)} x ${px(template.height)}` : '-',
      delta: template ? {
        width: delta(template.width, reference.templateCard.width),
        height: delta(template.height, reference.templateCard.height),
      } : null,
      status: template ? grade(Math.max(Math.abs(template.width - reference.templateCard.width), Math.abs(template.height - reference.templateCard.height)), 24, 64) : 'missing',
    },
    {
      item: '页面整体留白',
      prototype: `主卡片 x ${px(reference.composeCard.x)} / 模板 top ${px(reference.templateCard.top)} / 最近生成 top ${px(reference.recentCard.top)}`,
      current: compose && template && recent ? `主卡片 x ${px(compose.x)} / 模板 top ${px(template.y)} / 最近生成 top ${px(recent.y)}` : '-',
      delta: compose && template && recent ? {
        cardX: delta(compose.x, reference.composeCard.x),
        templateTop: delta(template.y, reference.templateCard.top),
        recentTop: delta(recent.y, reference.recentCard.top),
      } : null,
      status: compose && template && recent ? grade(Math.max(Math.abs(compose.x - reference.composeCard.x), Math.abs(template.y - reference.templateCard.top), Math.abs(recent.y - reference.recentCard.top)), 60, 150) : 'missing',
    },
  ]
  return rows
}

async function measurePage(page) {
  return page.evaluate(() => {
    const pick = (selector) => {
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
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      body: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      sidebar: pick('.app-sidebar'),
      topbarActions: pick('.app-topbar-actions'),
      appMain: pick('.app-main'),
      renderPage: pick('.render-video-page--quick'),
      renderHead: pick('.render-video-page--quick .render-head'),
      title: pick('.render-video-page--quick .render-head h1'),
      composeCard: pick('.quick-compose-card'),
      promptBox: pick('.quick-prompt-box'),
      promptTextarea: pick('.quick-prompt-box textarea'),
      uploadCard: pick('.quick-source-grid .quick-upload'),
      controlBar: pick('.quick-control-bar'),
      firstControlField: pick('.quick-control-field'),
      generateButton: pick('.quick-generate-button'),
      templateSection: pick('.quick-template-section'),
      templateCard: pick('.quick-template-strip button'),
      recentPanel: pick('.quick-recent-panel'),
      recentCard: pick('.quick-recent-item'),
    }
  }).then((metrics) => {
    const normalized = {}
    for (const [key, value] of Object.entries(metrics)) {
      normalized[key] = value && typeof value === 'object' && 'x' in value ? compactRect(value) : value
    }
    return normalized
  })
}

function printReport(report) {
  console.log(`视觉截图完成：${currentPath}`)
  console.log(`原型基准：${prototypePath}`)
  console.log(`当前截图尺寸：${report.images.current.width}x${report.images.current.height}`)
  console.log(`原型图尺寸：${report.images.prototype.width}x${report.images.prototype.height}`)
  console.log('主要差异：')
  for (const row of report.differences) {
    const deltaText = row.delta == null ? '-' : JSON.stringify(row.delta)
    console.log(`- ${row.item}：原型 ${row.prototype}；当前 ${row.current}；差异 ${deltaText}；状态 ${row.status}`)
  }
}

async function main() {
  ensureVisualFiles()
  const auth = await login()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
  }, auth)
  const page = await context.newPage()
  await page.goto(renderUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.render-video-page--quick .quick-compose-card', { timeout: 30000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: currentPath, fullPage: false })
  const metrics = await measurePage(page)
  await browser.close()

  const currentSize = readPngSize(currentPath)
  const prototypeSize = readPngSize(prototypePath)
  const viewportReference = buildViewportReference(prototypeSize)
  const report = {
    generatedAt: new Date().toISOString(),
    url: renderUrl,
    viewport,
    images: {
      current: { path: currentPath, ...currentSize },
      prototype: { path: prototypePath, ...prototypeSize },
    },
    prototypeReference,
    viewportReference,
    currentMetrics: metrics,
    differences: buildDifferenceRows(metrics, viewportReference),
  }
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  printReport(report)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
