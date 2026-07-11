import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual', 'pet-asset-reuse')
const appBaseUrl = process.env.PET_ASSET_REUSE_BASE_URL || 'http://127.0.0.1:5175'
const assetListUrls = []

const authUser = {
  userId: 90003,
  username: 'pet-asset-reuse-smoke',
  displayName: 'Pet Asset Reuse Smoke',
  role: 'ADMIN',
  status: 'ENABLED',
  permissions: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  features: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  creditBalance: 10000,
}

const dialogueAsset = {
  assetId: 2830,
  ownerUserId: null,
  projectId: null,
  taskId: null,
  assetType: 'JSON',
  kind: 'MATERIAL',
  visibility: 'PUBLIC',
  fileName: '零食失踪案｜猫狗互相举证.json',
  filePath: null,
  fileUrl: '/media/pet-assets/snack-evidence.json',
  thumbnailUrl: null,
  mimeType: 'application/json',
  fileSize: 4096,
  sourceType: 'USER_UPLOAD',
  assetGroup: '宠物文案',
  metadataJson: JSON.stringify({
    businessDomain: 'pet',
    assetGroup: '宠物文案',
    assetRole: 'voice_script',
    workflowStage: 'petCopy',
    title: '零食失踪案｜猫狗互相举证',
    displayName: '零食失踪案｜猫狗互相举证',
    officialTemplate: true,
  }),
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
}

const imageAssets = {
  主宠物候选: imageAsset(2713, '金毛豆包正面参考图.jpg', '主宠物候选', 'main_pet'),
  第二宠物候选: imageAsset(2691, '猫咪栗子正面参考图.jpg', '第二宠物候选', 'second_pet'),
  宠物背景图: imageAsset(2683, '温暖客厅场景图.jpg', '宠物背景图', 'scene'),
  '宠物产品/道具': imageAsset(2718, '宠物零食袋道具图.jpg', '宠物产品/道具', 'prop'),
}

const ownerAvatar = {
  avatarId: 77,
  projectId: null,
  taskId: null,
  assetId: 2720,
  ownerUserId: 90003,
  visibility: 'PRIVATE',
  status: 'READY',
  manageable: true,
  avatarName: '林然｜温暖家庭主人',
  sourceType: 'USER_UPLOAD',
  prompt: '温暖自然的宠物主人林然',
  referenceAssetIds: null,
  previewUrl: '/media/pet-assets/2720.jpg',
  metadataJson: JSON.stringify({ businessDomain: 'pet', assetRole: 'host_image' }),
  defaultAvatar: true,
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
}

const assetContent = {
  title: '零食失踪案｜猫狗互相举证',
  assetKind: 'dialogue',
  templateId: 'multi-pet-dialogue',
  videoType: 'dialogue',
  durationSeconds: 15,
  aspectRatio: '9:16',
  style: 'funny',
  prompt: '零食袋突然空了，豆包和栗子互相举证，最后发现主人换了包装。',
  roles: [
    { id: 'owner-linran', name: '林然', type: 'other', breed: '宠物主人', voiceName: '温柔女声', personalityTags: ['温暖'], roleTags: ['主人'], anthropomorphic: true },
    { id: 'dog-doubao', name: '豆包', type: 'dog', breed: '金毛犬', voiceName: '活泼男声', personalityTags: ['热情'], roleTags: ['主角'], anthropomorphic: true },
    { id: 'cat-lizi', name: '栗子', type: 'cat', breed: '中华田园猫', voiceName: '清亮女声', personalityTags: ['冷静'], roleTags: ['吐槽'], anthropomorphic: true },
  ],
  dialogueLines: [
    { order: 1, speakerRoleId: 'owner-linran', speakerName: '林然', text: '零食袋怎么空了？', emotion: '惊讶', voiceName: '温柔女声' },
    { order: 2, speakerRoleId: 'dog-doubao', speakerName: '豆包', text: '先声明，我只闻了三秒。', emotion: '认真解释', voiceName: '活泼男声' },
    { order: 3, speakerRoleId: 'cat-lizi', speakerName: '栗子', text: '嘴边碎屑也只待了三秒？', emotion: '吐槽', voiceName: '清亮女声' },
    { order: 4, speakerRoleId: 'dog-doubao', speakerName: '豆包', text: '那是证物，我负责保管。', emotion: '委屈', voiceName: '活泼男声' },
    { order: 5, speakerRoleId: 'cat-lizi', speakerName: '栗子', text: '证物正在被你消化。', emotion: '吐槽', voiceName: '清亮女声' },
  ],
  shots: [
    { index: 1, durationSeconds: 4, frameDescription: '空零食袋特写', characterAction: '两只宠物同时看向袋子', cameraMove: '快速推近', subtitle: '零食失踪案，现在开会' },
    { index: 2, durationSeconds: 4, frameDescription: '豆包正面近景', characterAction: '豆包抬爪解释', cameraMove: '稳定近景', subtitle: '我只闻了三秒' },
    { index: 3, durationSeconds: 3, frameDescription: '栗子侧脸近景', characterAction: '栗子看向碎屑', cameraMove: '轻微横移', subtitle: '碎屑也只待三秒？' },
    { index: 4, durationSeconds: 4, frameDescription: '猫狗并排坐好', characterAction: '误会解除', cameraMove: '缓慢拉远', subtitle: '主人只是换了包装' },
  ],
  subtitleStyle: { position: 'bottom', fontSize: 34, textColor: '#FFFFFF', outlineColor: '#111827', strokeMode: 'strong' },
  materialHints: {
    human_avatar: { keyword: '林然 主人' },
    main_pet: { keyword: '金毛 dog' },
    second_pet: { keyword: '猫 cat' },
    scene: { keyword: '温暖客厅 living room' },
    prop: { keyword: '宠物零食 snack' },
  },
}

function imageAsset(assetId, fileName, assetGroup, assetRole) {
  return {
    assetId,
    ownerUserId: null,
    projectId: null,
    taskId: null,
    assetType: 'IMAGE',
    kind: 'MATERIAL',
    visibility: 'PUBLIC',
    fileName,
    filePath: null,
    fileUrl: `/media/pet-assets/${assetId}.jpg`,
    thumbnailUrl: `/media/pet-assets/${assetId}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 2048,
    sourceType: 'USER_UPLOAD',
    assetGroup,
    metadataJson: JSON.stringify({ businessDomain: 'pet', assetGroup, assetRole }),
    createdAt: '2026-07-11T08:00:00Z',
    updatedAt: '2026-07-11T08:00:00Z',
  }
}

function apiPayload(data) {
  return JSON.stringify({ code: 0, message: 'OK', data, traceId: 'pet-asset-reuse-smoke' })
}

async function prepareContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 })
  await context.addInitScript((user) => {
    localStorage.setItem('huashuo_user_access_token', 'pet-asset-reuse-smoke-token')
    localStorage.setItem('huashuo_user', JSON.stringify(user))
    localStorage.removeItem('huashuo_pet_creation_draft')
  }, authUser)

  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method().toUpperCase()
    if (method !== 'GET') throw new Error(`Pet asset reuse smoke must not call ${method} ${url.pathname}`)
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: apiPayload(authUser) })
    if (url.pathname.endsWith('/tasks/summary')) return route.fulfill({ status: 200, contentType: 'application/json', body: apiPayload({ processingCount: 0, successCount: 0, failedCount: 0, records: [] }) })
    if (/\/assets\/2830\/content$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(assetContent) })
    if (/\/assets$/.test(url.pathname)) {
      assetListUrls.push(url.toString())
      const group = url.searchParams.get('assetGroup')
      const list = group ? (imageAssets[group] ? [imageAssets[group]] : []) : [dialogueAsset, ...Object.values(imageAssets)]
      return route.fulfill({ status: 200, contentType: 'application/json', body: apiPayload(list) })
    }
    if (/\/avatars$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: apiPayload([ownerAvatar]) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: apiPayload([]) })
  })
  return context
}

function check(item, pass, detail) {
  return { item, status: pass ? 'ok' : 'needs-work', detail }
}

async function main() {
  fs.mkdirSync(visualDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const checks = []
  let screenshotPath = ''
  try {
    const context = await prepareContext(browser)
    const page = await context.newPage()
    const response = await page.goto(`${appBaseUrl}/pet-assets?workflowStage=petCopy&scope=global`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.getByRole('button', { name: '一键使用', exact: true }).first().waitFor({ timeout: 30000 })
    const title = await page.locator('.asset-row-title').first().textContent()
    const initialAssetListUrl = assetListUrls[0] || ''
    checks.push(check('/pet-assets returns 200', response?.status() === 200, `HTTP ${response?.status()}`))
    checks.push(check('route scope applies to the first asset request', initialAssetListUrl.includes('scope=global'), initialAssetListUrl))
    checks.push(check('pet asset uses a readable Chinese title', Boolean(title?.includes('零食失踪案') && !title.includes('.json')), title || ''))

    await page.getByRole('button', { name: '一键使用', exact: true }).first().click()
    await page.waitForURL(/\/pet-render\/dialogue/, { timeout: 30000 })
    await page.waitForTimeout(500)
    const result = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('huashuo_pet_creation_draft') || 'null')
      return {
        path: location.pathname,
        templateId: draft?.templateId,
        roleNames: draft?.roles?.map((role) => role.name) || [],
        dialogueIds: draft?.dialogueLines?.map((line) => line.id) || [],
        speakers: draft?.dialogueLines?.map((line) => line.speakerRoleId) || [],
        materialRoles: draft?.materials?.map((material) => material.role) || [],
        materialLabels: draft?.materials?.map((material) => material.label) || [],
        shotIndexes: draft?.shots?.map((shot) => shot.index) || [],
        ratio: draft?.aspectRatio,
      }
    })
    checks.push(check('one-click import opens the matching dialogue editor', result.path === '/pet-render/dialogue' && result.templateId === 'multi-pet-dialogue', JSON.stringify(result)))
    checks.push(check('roles and dialogue speakers are mapped in order', result.roleNames.join(',') === '林然,豆包,栗子' && result.dialogueIds.join(',') === 'asset-dialogue-01,asset-dialogue-02,asset-dialogue-03,asset-dialogue-04,asset-dialogue-05' && result.speakers.join(',') === 'owner-linran,dog-doubao,cat-lizi,dog-doubao,cat-lizi', JSON.stringify(result.speakers)))
    checks.push(check('storyboards remain sequential and ratio is preserved', result.shotIndexes.join(',') === '1,2,3,4' && result.ratio === '9:16', `${result.shotIndexes.join(',')} · ${result.ratio}`))
    checks.push(check('matching pets, owner, scene and prop are selected automatically', ['main_pet', 'second_pet', 'human_avatar', 'scene', 'prop'].every((role) => result.materialRoles.includes(role)), JSON.stringify(result.materialRoles)))
    checks.push(check('matched asset labels are readable Chinese', result.materialLabels.every((label) => /[\u4e00-\u9fff]/.test(label)), JSON.stringify(result.materialLabels)))

    screenshotPath = path.join(visualDir, 'pet-asset-one-click-import.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    await context.close()
  } finally {
    await browser.close().catch(() => undefined)
  }
  const report = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    status: checks.some((item) => item.status !== 'ok') ? 'needs-work' : 'ok',
    screenshotPath,
    checks,
  }
  const reportPath = path.join(visualDir, 'pet-asset-reuse-smoke-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (report.status !== 'ok') process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
