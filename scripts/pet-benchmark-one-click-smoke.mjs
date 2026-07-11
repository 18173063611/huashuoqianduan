import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const visualDir = path.join(projectRoot, 'visual', 'pet-benchmark-one-click')
const appBaseUrl = process.env.PET_BENCHMARK_BASE_URL || 'http://127.0.0.1:5175'

const user = {
  userId: 90004,
  username: 'pet-benchmark-smoke',
  displayName: 'Pet Benchmark Smoke',
  role: 'ADMIN',
  status: 'ENABLED',
  permissions: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  features: ['PET_CREATION_ACCESS', 'VEHICLE_CREATION_ACCESS'],
  creditBalance: 10000,
}

const sourceShots = [
  { order: 1, time: '00:00:00-00:00:02', page: '温暖客厅里，金毛犬豆包看向零食罐', backgroundMusic: '轻快', content: '豆包：今天可以申请加餐吗？', highlight: '首秒问题钩子，快速推近' },
  { order: 2, time: '00:00:02-00:00:04', page: '小猫栗子坐在沙发上冷静看向豆包', backgroundMusic: '轻快', content: '栗子：先别激动，上次理由是我可爱。', highlight: '反打近景，建立角色反差' },
  { order: 3, time: '00:00:04-00:00:06', page: '主人林然拿着任务卡加入画面', backgroundMusic: '轻快', content: '林然：想加餐，先完成小任务。', highlight: '人物入镜推动冲突' },
  { order: 4, time: '00:00:06-00:00:09', page: '豆包积极抬爪，栗子在旁边观察', backgroundMusic: '节奏加快', content: '豆包：准备好了。栗子：我监督。', highlight: '同镜头双角色连续对话' },
  { order: 5, time: '00:00:09-00:00:11', page: '人物与猫狗一起靠在沙发边温暖收尾', backgroundMusic: '温暖', content: '无', highlight: '缓慢拉远形成完整结尾' },
]

const images = {
  主宠物候选: imageAsset(2713, '金毛豆包参考图.jpg', '主宠物候选', 'main_pet'),
  第二宠物候选: imageAsset(2691, '猫咪栗子参考图.jpg', '第二宠物候选', 'second_pet'),
  宠物背景图: imageAsset(2683, '温暖客厅场景图.jpg', '宠物背景图', 'scene'),
}

const ownerAvatar = {
  avatarId: 77,
  assetId: 2720,
  avatarName: '林然｜温暖家庭主人',
  sourceType: 'USER_UPLOAD',
  prompt: '宠物主人林然',
  previewUrl: '/media/2720.jpg',
  defaultAvatar: true,
  metadataJson: JSON.stringify({ businessDomain: 'pet' }),
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
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
    fileUrl: `/media/${assetId}.jpg`,
    thumbnailUrl: `/media/${assetId}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 2048,
    sourceType: 'USER_UPLOAD',
    assetGroup,
    metadataJson: JSON.stringify({ businessDomain: 'pet', assetGroup, assetRole }),
    createdAt: '2026-07-11T08:00:00Z',
    updatedAt: '2026-07-11T08:00:00Z',
  }
}

function task(status = 'SUCCESS') {
  return {
    taskId: 900,
    projectId: null,
    ownerUserId: user.userId,
    taskType: 'VIDEO_SCRIPT_URL_ANALYZE',
    status,
    progress: status === 'SUCCESS' ? 100 : 0,
    resultAssetId: 901,
    errorCode: null,
    retryCount: 0,
    inputJson: null,
    outputJson: null,
    errorMessage: null,
    traceId: 'pet-benchmark-smoke',
    createdAt: '2026-07-11T08:00:00Z',
    updatedAt: '2026-07-11T08:00:01Z',
  }
}

function payload(data) {
  return JSON.stringify({ code: 0, message: 'OK', data, traceId: 'pet-benchmark-smoke' })
}

async function main() {
  fs.mkdirSync(visualDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const checks = []
  let analysisPosts = 0
  let assetUploads = 0
  let videoGenerationPosts = 0
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
    await context.addInitScript((authUser) => {
      localStorage.setItem('huashuo_user_access_token', 'pet-benchmark-smoke-token')
      localStorage.setItem('huashuo_user', JSON.stringify(authUser))
      localStorage.removeItem('huashuo_pet_creation_draft')
    }, user)
    await context.route('**/api/v1/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method().toUpperCase()
      if (url.pathname.endsWith('/video/script/url') && method === 'POST') {
        analysisPosts += 1
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload(task('QUEUED')) })
      }
      if (/\/tasks\/900\/result$/.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload({ ...task('SUCCESS'), result: { scripts: sourceShots } }) })
      }
      if (/\/tasks\/900$/.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload(task('SUCCESS')) })
      }
      if (url.pathname.endsWith('/assets/upload') && method === 'POST') {
        assetUploads += 1
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload({
          assetId: 990,
          ownerUserId: user.userId,
          assetType: 'JSON',
          fileName: '爆款对标分镜.json',
          fileUrl: '/media/990.json',
          fileSize: 4096,
          sourceType: 'USER_UPLOAD',
          assetGroup: '宠物分镜',
          metadataJson: '{}',
          createdAt: '2026-07-11T08:00:00Z',
          updatedAt: '2026-07-11T08:00:00Z',
        }) })
      }
      if (url.pathname.includes('/pet-videos') && method === 'POST') {
        videoGenerationPosts += 1
        return route.abort('blockedbyclient')
      }
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: payload(user) })
      if (url.pathname.endsWith('/tasks/summary')) return route.fulfill({ status: 200, contentType: 'application/json', body: payload({ processingCount: 0, successCount: 0, failedCount: 0, records: [] }) })
      if (url.pathname.endsWith('/avatars')) return route.fulfill({ status: 200, contentType: 'application/json', body: payload([ownerAvatar]) })
      if (url.pathname.endsWith('/assets')) {
        const group = url.searchParams.get('assetGroup')
        const rows = group && images[group] ? [images[group]] : []
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload(rows) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: payload([]) })
    })

    const page = await context.newPage()
    await page.goto(`${appBaseUrl}/pet-tools/benchmark`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.locator('input[type="url"]').fill('https://example.com/existing-pet-demo.mp4')
    await page.locator('input[type="number"]').fill('11')
    await page.locator('input[placeholder*="午后客厅"]').fill('温暖客厅，人物与猫狗同框')
    await page.getByRole('button', { name: '分析并一键导入', exact: true }).click()
    await page.getByText(/已整理 3 个角色、5 条台词和 5 个分镜/).waitFor({ timeout: 30000 })
    const result = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('huashuo_pet_creation_draft') || 'null')
      return {
        templateId: draft?.templateId,
        durationSeconds: draft?.durationSeconds,
        aspectRatio: draft?.aspectRatio,
        roles: draft?.roles?.map((role) => ({ id: role.id, name: role.name, type: role.type, voiceName: role.voiceName, referenceAssetIds: role.referenceAssetIds })) || [],
        dialogueLines: draft?.dialogueLines?.map((line) => ({ id: line.id, speakerRoleId: line.speakerRoleId, text: line.text, voiceName: line.voiceName })) || [],
        materials: draft?.materials?.map((material) => ({ role: material.role, assetId: material.assetId, label: material.label })) || [],
        shots: draft?.shots?.map((shot) => shot.index) || [],
        summary: [...document.querySelectorAll('.pet-script-import-summary span')].map((element) => element.textContent?.trim()).filter(Boolean),
      }
    })
    checks.push(check('one analysis task only', analysisPosts === 1, `analysisPosts=${analysisPosts}`))
    checks.push(check('no pet video generation request', videoGenerationPosts === 0, `videoGenerationPosts=${videoGenerationPosts}`))
    checks.push(check('analysis asset is saved once', assetUploads === 1, `assetUploads=${assetUploads}`))
    checks.push(check('named speakers become Chinese roles', result.roles.map((role) => `${role.name}:${role.type}`).join(',') === '豆包:dog,栗子:cat,林然:other', JSON.stringify(result.roles)))
    checks.push(check('same-shot dialogue is split and mapped', result.dialogueLines.length === 5 && result.dialogueLines[3]?.text === '准备好了' && result.dialogueLines[4]?.text === '我监督' && result.dialogueLines[3]?.speakerRoleId === result.roles[0]?.id && result.dialogueLines[4]?.speakerRoleId === result.roles[1]?.id, JSON.stringify(result.dialogueLines)))
    checks.push(check('roles keep distinct voices', new Set(result.roles.map((role) => role.voiceName)).size === 3, JSON.stringify(result.roles.map((role) => role.voiceName))))
    checks.push(check('pets, owner and scene are auto-matched', ['main_pet', 'second_pet', 'human_avatar', 'scene'].every((role) => result.materials.some((material) => material.role === role)), JSON.stringify(result.materials)))
    checks.push(check('ratio, duration and shot order are preserved', result.aspectRatio === '9:16' && result.durationSeconds === 11 && result.shots.join(',') === '1,2,3,4,5', `${result.aspectRatio} · ${result.durationSeconds} · ${result.shots.join(',')}`))
    checks.push(check('result is saved as reusable asset', result.summary.includes('已保存为资产 #990'), JSON.stringify(result.summary)))

    await page.screenshot({ path: path.join(visualDir, 'pet-benchmark-one-click.png'), fullPage: false })
    await context.close()
  } finally {
    await browser.close().catch(() => undefined)
  }
  const report = {
    generatedAt: new Date().toISOString(),
    appBaseUrl,
    status: checks.every((item) => item.status === 'ok') ? 'ok' : 'needs-work',
    checks,
  }
  fs.writeFileSync(path.join(visualDir, 'pet-benchmark-one-click-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (report.status !== 'ok') process.exitCode = 1
}

function check(item, pass, detail) {
  return { item, status: pass ? 'ok' : 'needs-work', detail }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
