import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual', 'pet-template-layout')
const appBaseUrl = process.env.PET_TEMPLATE_SMOKE_BASE_URL || 'http://127.0.0.1:5175'
const selectorTimeout = 15000

const authPayload = {
  token: process.env.VISUAL_AUTH_TOKEN || 'pet-template-layout-smoke-token',
  user: {
    userId: 90001,
    username: 'pet-ui-smoke',
    displayName: 'Pet UI Smoke',
    role: 'ADMIN',
    status: 'ENABLED',
    permissions: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
    features: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
    creditBalance: 10000,
  },
}

const viewports = [
  { key: 'desktop', width: 1440, height: 1000, expectedColumns: [3, 4] },
  { key: 'tablet', width: 1024, height: 900, expectedColumns: [2, 3] },
  { key: 'mobile', width: 390, height: 844, expectedColumns: [1, 1] },
]

function ensureDir() {
  fs.mkdirSync(visualDir, { recursive: true })
}

function makeCheck(item, pass, detail) {
  return { item, status: pass ? 'ok' : 'needs-work', detail }
}

function summarize(checks) {
  return checks.some((check) => check.status === 'needs-work') ? 'needs-work' : 'ok'
}

async function prepareContext(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ignoreHTTPSErrors: true })
  await context.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'OK', data: authPayload.user, traceId: 'pet-template-smoke' }),
    })
  })
  await context.route('**/api/v1/tasks/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'OK',
        data: { processingCount: 0, successCount: 0, failedCount: 0, records: [] },
        traceId: 'pet-template-smoke',
      }),
    })
  })
  await context.route('**/api/v1/pet-videos/works**', async (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'OK', data: [], traceId: 'pet-template-smoke' }),
      })
      return
    }
    await route.continue()
  })
  await context.route('**/api/v1/assets**', async (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'OK', data: { records: [], total: 0 }, traceId: 'pet-template-smoke' }),
      })
      return
    }
    await route.continue()
  })
  await context.route('**/api/v1/billing/estimate**', async (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'OK',
          data: {
            taskType: 'PET_IMAGE_GENERATE',
            estimatedCreditCost: 20,
            usageUnit: null,
            modelCode: null,
            provider: null,
            pricingSource: 'SMOKE_MOCK',
            balance: 10000,
            enoughBalance: true,
            steps: [],
          },
          traceId: 'pet-template-smoke',
        }),
      })
      return
    }
    await route.continue()
  })
  await context.route('**/api/v1/avatars**', async (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'OK', data: [], traceId: 'pet-template-smoke' }),
      })
      return
    }
    await route.continue()
  })
  await context.route('**/api/v1/pet-videos/tasks**', async (route) => {
    if (route.request().method().toUpperCase() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 409, message: 'blocked by pet template smoke' }),
      })
      return
    }
    await route.continue()
  })
  await context.addInitScript((payload) => {
    window.localStorage.setItem('huashuo_user_access_token', payload.token)
    window.localStorage.setItem('huashuo_user', JSON.stringify(payload.user))
  }, authPayload)
  return context
}

async function hardenLongCardContent(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate(() => {
        const title = document.querySelector('.pet-template-title-row strong')
        const desc = document.querySelector('.pet-template-card p')
        const tags = document.querySelector('.pet-template-card-tags')
        if (title) title.textContent = '这是一个非常非常长但不应该撑爆卡片高度的宠物模板标题用于布局测试'
        if (desc) {
          desc.textContent = '这是一段非常长的模板描述，用来验证两行省略是否生效，卡片高度是否保持一致，标签和底部按钮是否仍然固定在稳定位置。'
        }
        if (tags) {
          for (let index = 0; index < 8; index += 1) {
            const tag = document.createElement('span')
            tag.textContent = `额外标签${index + 1}`
            tags.appendChild(tag)
          }
        }
      })
      return
    } catch (error) {
      if (attempt >= 2) throw error
      await page.waitForLoadState('domcontentloaded').catch(() => undefined)
      await page.waitForSelector('.pet-template-card', { timeout: selectorTimeout })
      await page.waitForTimeout(300)
    }
  }
}
async function collectCardMetrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.pet-template-card')]
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom),
        }
      })
      .filter((rect) => rect.width > 0 && rect.height > 0)
    const firstRowY = cards.length ? Math.min(...cards.map((card) => card.y)) : 0
    const firstRowCards = cards.filter((card) => Math.abs(card.y - firstRowY) <= 4)
    const heights = cards.map((card) => card.height)
    const bottoms = firstRowCards.map((card) => card.bottom)
    const action = document.querySelector('.pet-template-card-action')
    const actionBg = action ? getComputedStyle(action).backgroundColor : ''
    const titleEl = document.querySelector('.pet-template-title-row strong')
    const descEl = document.querySelector('.pet-template-card p')
    const tagEl = document.querySelector('.pet-template-card-tags')
    const titleClamp = titleEl ? getComputedStyle(titleEl).webkitLineClamp : ''
    const descClamp = descEl ? getComputedStyle(descEl).webkitLineClamp : ''
    const tagMaxHeight = tagEl ? parseFloat(getComputedStyle(tagEl).maxHeight || '0') : 0
    const bodyText = document.body.innerText.replace(/\s+/g, ' ')
    return {
      cardCount: cards.length,
      columns: new Set(firstRowCards.map((card) => card.x)).size,
      heightSpread: cards.length ? Math.max(...heights) - Math.min(...heights) : 999,
      firstRowBottomSpread: bottoms.length ? Math.max(...bottoms) - Math.min(...bottoms) : 999,
      titleClamp,
      descClamp,
      tagMaxHeight,
      actionBg,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
      hasCarPositiveCopy: /汽车销售|展厅|车型|试驾/.test(bodyText),
    }
  })
}

async function runCardLayoutCheck(browser, viewport) {
  const context = await prepareContext(browser, viewport)
  const page = await context.newPage()
  const response = await page.goto(`${appBaseUrl}/pet-render`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pet-page', { timeout: selectorTimeout })
  await page.waitForSelector('.pet-template-card', { timeout: selectorTimeout })
  await page.waitForTimeout(500)
  await hardenLongCardContent(page)
  await page.waitForTimeout(200)
  const screenshotPath = path.join(visualDir, `pet-render-cards-${viewport.key}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: false })
  const metrics = await collectCardMetrics(page)
  const checks = [
    makeCheck('/pet-render 返回 200', response?.status() === 200, `HTTP ${response?.status()}`),
    makeCheck('模板卡片存在', metrics.cardCount > 0, `cards=${metrics.cardCount}`),
    makeCheck('响应式列数正常', metrics.columns >= viewport.expectedColumns[0] && metrics.columns <= viewport.expectedColumns[1], `columns=${metrics.columns}`),
    makeCheck('模板卡片等高', metrics.heightSpread <= 24, `heightSpread=${Math.round(metrics.heightSpread)}px`),
    makeCheck('首行没有向下突出', metrics.firstRowBottomSpread <= 4, `bottomSpread=${Math.round(metrics.firstRowBottomSpread)}px`),
    makeCheck('标题/描述有行数约束', metrics.titleClamp === '1' && metrics.descClamp === '2', `title=${metrics.titleClamp}, desc=${metrics.descClamp}`),
    makeCheck('标签区高度受控', metrics.tagMaxHeight > 0 && metrics.tagMaxHeight <= 64, `tagMaxHeight=${Math.round(metrics.tagMaxHeight)}px`),
    makeCheck('按钮仍为蓝色体系', /rgb\(37,\s*99,\s*235\)/.test(metrics.actionBg), metrics.actionBg),
    makeCheck('无横向溢出', !metrics.hasHorizontalOverflow, 'document width within viewport'),
    makeCheck('宠物模板页无汽车正向文案', !metrics.hasCarPositiveCopy, 'no car sales/showroom/model/test drive copy'),
  ]
  await context.close()
  return { key: `PetTemplateGalleryLayoutTest:${viewport.key}`, status: summarize(checks), screenshotPath, metrics, checks }
}

async function collectProductionMetrics(page, rootSelector) {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector)?.getBoundingClientRect()
    const right = document.querySelector('.pet-right-column')?.getBoundingClientRect()
    const material = document.querySelector('.pet-material-picker')?.getBoundingClientRect()
    const actions = document.querySelector('.pet-actions')?.getBoundingClientRect()
    const shotList = document.querySelector('.pet-shot-list, .pet-line-list')?.getBoundingClientRect()
    const bodyText = document.body.innerText.replace(/\s+/g, ' ')
    return {
      rootVisible: Boolean(root && root.width > 0 && root.height > 0),
      rightHeight: right?.height || 0,
      materialHeight: material?.height || 0,
      actionsVisible: Boolean(actions && actions.width > 0 && actions.height > 0),
      listHeight: shotList?.height || 0,
      viewportHeight: window.innerHeight,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
      hasCarPositiveCopy: /汽车销售|展厅|车型|试驾/.test(bodyText),
    }
  }, rootSelector)
}

async function runProductionLayoutCheck(browser, config) {
  const context = await prepareContext(browser, { width: 1440, height: 1000 })
  const page = await context.newPage()
  const response = await page.goto(`${appBaseUrl}${config.url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(config.selector, { timeout: selectorTimeout })
  await page.waitForTimeout(600)
  const screenshotPath = path.join(visualDir, `${config.key}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: false })
  const metrics = await collectProductionMetrics(page, config.selector)
  const checks = [
    makeCheck(`${config.url} 返回 200`, response?.status() === 200, `HTTP ${response?.status()}`),
    makeCheck('模板生产页根节点正常', metrics.rootVisible, config.selector),
    makeCheck('右侧配置区高度受控', metrics.rightHeight <= metrics.viewportHeight, `right=${Math.round(metrics.rightHeight)}px`),
    makeCheck('素材选择区不撑爆首屏', metrics.materialHeight <= metrics.viewportHeight, `material=${Math.round(metrics.materialHeight)}px`),
    makeCheck('底部操作区可见', metrics.actionsVisible, 'actions visible'),
    makeCheck('分镜/台词列表高度受控', metrics.listHeight <= metrics.viewportHeight, `list=${Math.round(metrics.listHeight)}px`),
    makeCheck('无横向溢出', !metrics.hasHorizontalOverflow, 'document width within viewport'),
    makeCheck('宠物生产页无汽车正向文案', !metrics.hasCarPositiveCopy, 'no car sales/showroom/model/test drive copy'),
  ]
  await context.close()
  return { key: config.key, status: summarize(checks), screenshotPath, metrics, checks }
}

async function runRouteSmoke(browser) {
  const context = await prepareContext(browser, { width: 1366, height: 900 })
  const pages = [
    { key: 'PET_RENDER', url: '/pet-render', selector: '.pet-page' },
    { key: 'PET_STICKER', url: '/pet-render/sticker', selector: '.pet-sticker-page' },
    { key: 'PET_DIALOGUE', url: '/pet-render/dialogue', selector: '.pet-dialogue-page' },
    { key: 'PET_ASSETS', url: '/pet-assets', selector: '.pet-asset-center-page' },
    { key: 'PET_AVATAR', url: '/pet-tools/avatar', selector: '.avatar-page' },
    { key: 'CAR_RENDER', url: '/render', selector: '.car-sales-create-page' },
    { key: 'CAR_ASSETS', url: '/assets', selector: '.asset-center-page' },
  ]
  const checks = []
  for (const item of pages) {
    const page = await context.newPage()
    try {
      const response = await page.goto(`${appBaseUrl}${item.url}`, { waitUntil: 'domcontentloaded', timeout: selectorTimeout })
      await page.waitForSelector(item.selector, { timeout: selectorTimeout })
      const petTemplateCount = item.key.startsWith('CAR')
        ? await page.locator('.pet-template-card, .pet-material-picker, .pet-generation-param-panel').count()
        : 0
      checks.push(makeCheck(`${item.key} 返回 200`, response?.status() === 200, `${item.url} HTTP ${response?.status()}`))
      checks.push(makeCheck(`${item.key} 根节点正常`, await page.locator(item.selector).count() > 0, item.selector))
      checks.push(makeCheck(`${item.key} 汽车侧无宠物模板组件污染`, petTemplateCount === 0, item.key.startsWith('CAR') ? `petTemplateCount=${petTemplateCount}` : 'not car route'))
    } catch (error) {
      checks.push(makeCheck(`${item.key} route smoke`, false, error instanceof Error ? error.message : String(error)))
    }
    await page.close()
  }
  await context.close()
  return { key: 'PetNoCarRegressionSmoke', status: summarize(checks), checks }
}

function printReport(report) {
  console.log(`\n${report.key}: ${report.status}`)
  if (report.screenshotPath) console.log(`screenshot: ${report.screenshotPath}`)
  for (const check of report.checks) {
    console.log(`- [${check.status}] ${check.item}: ${check.detail}`)
  }
}

async function main() {
  ensureDir()
  const browser = await chromium.launch({ headless: true })
  const reports = []
  try {
    for (const viewport of viewports) {
      console.log(`Running card layout check: ${viewport.key}`)
      reports.push(await runCardLayoutCheck(browser, viewport))
    }
    reports.push(await runProductionLayoutCheck(browser, {
      key: 'PetStoryboardTemplateLayoutTest',
      url: '/pet-render/storyboard?templateId=dog-reaction',
      selector: '.pet-storyboard-page',
    }))
    reports.push(await runProductionLayoutCheck(browser, {
      key: 'PetDialogueTemplateLayoutTest',
      url: '/pet-render/dialogue',
      selector: '.pet-dialogue-page',
    }))
    reports.push(await runRouteSmoke(browser))
  } finally {
    await browser.close().catch(() => undefined)
  }

  const allChecks = reports.flatMap((report) => report.checks)
  const fullReport = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    status: summarize(allChecks),
    reports,
  }
  const reportPath = path.join(visualDir, 'pet-template-layout-smoke-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(fullReport, null, 2)}\n`, 'utf8')
  for (const report of reports) printReport(report)
  console.log(`\nsmoke report: ${reportPath}`)
  if (fullReport.status !== 'ok') process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
