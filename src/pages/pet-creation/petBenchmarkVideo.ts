import type { VideoScriptShotItem } from '../../types/videoTypes'
import type { PetCreationDraft, PetDialogueEmotion, PetDialogueLine, PetRole, PetStoryboardShot } from './petCreationTypes'

export type PetBenchmarkPlatformOption = {
  value: string
  label: string
  placeholder: string
  limitReason?: string
}

export const petBenchmarkPlatformOptions: PetBenchmarkPlatformOption[] = [
  {
    value: 'auto',
    label: '自动',
    placeholder: '粘贴抖音 / 小红书 / 视频号 / TikTok / 快手 / B站 / YouTube 等视频链接',
  },
  {
    value: 'douyin',
    label: '抖音',
    placeholder: '粘贴抖音分享链接或完整分享文案',
  },
  {
    value: 'xiaohongshu',
    label: '小红书',
    placeholder: '粘贴小红书完整分享文案或 http(s) 链接',
  },
  {
    value: 'wechat_channels',
    label: '视频号',
    placeholder: '粘贴微信视频号分享链接，例如 https://weixin.qq.com/sph/...',
    limitReason:
      '微信视频号暂不支持直接链接解析。请改用本地上传，或粘贴可公开访问的视频直链。',
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    placeholder: '粘贴 TikTok 视频链接',
  },
  {
    value: 'kuaishou',
    label: '快手',
    placeholder: '粘贴快手分享链接或完整分享文案',
  },
  {
    value: 'bilibili',
    label: 'B站',
    placeholder: '粘贴 B 站视频链接',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    placeholder: '粘贴 YouTube 视频链接',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    placeholder: '粘贴 Facebook 公开视频链接',
    limitReason:
      'Facebook 暂不支持直接链接解析。公开视频常受登录、地区、隐私权限和防下载策略限制，请改用可直接访问的视频直链。',
  },
]

export function detectPetBenchmarkPlatform(value: string) {
  const text = value.toLowerCase()
  if (!text.trim()) return ''
  if (/douyin\.com|iesdouyin\.com|amemv\.com|douyinvod\.com/.test(text)) return 'douyin'
  if (/xiaohongshu\.com|xhslink\.com|xhscdn\.com|xhs\.cn/.test(text)) return 'xiaohongshu'
  if (/weixin\.qq\.com\/sph|channels\.weixin\.qq\.com|finder\.video\.qq\.com|finder\.video\.wechat\.com/.test(text)) return 'wechat_channels'
  if (/tiktok\.com|tiktokv\.com|vm\.tiktok\.com|vt\.tiktok\.com|musical\.ly/.test(text)) return 'tiktok'
  if (/kuaishou\.com|kwai\.com|gifshow\.com|kwaicdn\.com|ksapisrv\.com|oskwai\.com|yximgs\.com/.test(text)) return 'kuaishou'
  if (/bilibili\.com|b23\.tv|bilivideo\.com|hdslb\.com|biliimg\.com/.test(text)) return 'bilibili'
  if (/youtube\.com|youtu\.be|googlevideo\.com/.test(text)) return 'youtube'
  if (/facebook\.com|fb\.watch|fbcdn\.net|fb\.com/.test(text)) return 'facebook'
  return ''
}

export function getPetBenchmarkPlatformOption(value: string) {
  return petBenchmarkPlatformOptions.find((option) => option.value === value) || petBenchmarkPlatformOptions[0]
}

export function applyVideoBenchmarkToPetDraft(
  draft: PetCreationDraft,
  sourceShots: VideoScriptShotItem[],
  targetUrl: string,
  maxShotCount = 6,
) {
  const sortedShots = sortedVideoShots(sourceShots)
  const petShots = mapVideoShotsToPetShots(sortedShots, draft.durationSeconds, maxShotCount)
  const transcript = buildPetScriptText(sortedShots)
  const visualSummary = buildVisualSummary(sortedShots)
  const currentPrompt = cleanText(draft.prompt)

  draft.prompt = [
    currentPrompt,
    `参考对标视频链接：${targetUrl}`,
    `将原片结构改写为萌宠短视频：${visualSummary || '保留原片钩子、递进和结尾包袱，并替换为单个宠物或多宠物互动。'}`,
  ].filter(Boolean).join('。').slice(0, 500)
  draft.videoType = 'short_drama'
  draft.visualSettings.cameraRhythm = 'short_drama'
  draft.visualSettings.expressionIntensity = Math.max(draft.visualSettings.expressionIntensity || 0, 84)
  draft.subtitleEnabled = true
  if (transcript) {
    draft.scriptText = transcript
  }
  if (petShots.length > 0) {
    draft.shots = petShots
  }

  return {
    shotCount: petShots.length,
    scriptText: transcript,
  }
}

export function buildPetBenchmarkDialoguePlan(
  sourceShots: VideoScriptShotItem[],
  fallbackRoles: PetRole[],
) {
  const namedSegments = sourceShots.flatMap((shot) => extractNamedDialogueSegments(cleanText(shot.content)))
  const speakerNames = [...new Set(namedSegments.map((segment) => segment.speakerName))]
  const roles = speakerNames.length > 0
    ? speakerNames.map((name, index) => benchmarkRole(name, index, sourceShots))
    : fallbackRoles.slice(0, 2).map((role) => ({ ...role, referenceAssetIds: [] }))
  const roleByName = new Map(roles.map((role) => [role.name, role]))
  const sourceLines = namedSegments.length > 0
    ? namedSegments
    : sourceShots
        .map((shot, index) => ({
          speakerName: roles[index % Math.max(1, roles.length)]?.name || '',
          text: cleanText(shot.content),
        }))
        .filter((line) => line.speakerName && line.text && line.text !== '无')
  const dialogueLines = sourceLines
    .map((line, index): PetDialogueLine | null => {
      const role = roleByName.get(line.speakerName) || roles[index % Math.max(1, roles.length)]
      const text = cleanDialogueSegment(line.text)
      if (!role || !text || text === '无') return null
      return {
        id: `benchmark-dialogue-${String(index + 1).padStart(2, '0')}`,
        speakerRoleId: role.id,
        text: text.slice(0, 80),
        emotion: inferDialogueEmotion(text),
        speed: 'normal',
        voiceName: role.voiceName || defaultBenchmarkVoice(role.type, index),
        lipSync: true,
      }
    })
    .filter((line): line is PetDialogueLine => Boolean(line))

  return { roles, dialogueLines }
}

export function mapVideoShotsToPetShots(
  sourceShots: VideoScriptShotItem[],
  targetDurationSeconds: number,
  maxShotCount = 6,
): PetStoryboardShot[] {
  const selected = sortedVideoShots(sourceShots).slice(0, Math.max(1, maxShotCount))
  const mapped = selected.map((shot, index) => mapVideoShotToPetShot(shot, index))
  fitPetShotDurations(mapped, targetDurationSeconds)
  return mapped
}

function sortedVideoShots(sourceShots: VideoScriptShotItem[]) {
  return [...sourceShots].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
}

function mapVideoShotToPetShot(shot: VideoScriptShotItem, index: number): PetStoryboardShot {
  const visual = cleanText(shot.visualPrompt, shot.prompt, shot.page)
  const action = cleanText(shot.highlight, shot.content)
  const cameraMove = cleanText(
    shot.cameraMotion,
    shot.camera,
    shot.movement,
    shot.shotType,
    shot.framing,
    shot.composition,
    shot.transition,
  )

  return {
    id: `benchmark-shot-${Date.now()}-${index + 1}`,
    index: index + 1,
    durationSeconds: 3,
    frameDescription: visual
      ? `按原片节奏改写为萌宠画面：${visual}`
      : '主宠物在镜头中完成一个清晰的表情或动作递进',
    characterAction: action
      ? `主宠物承接原片情绪点：${action}`
      : '主宠物保持正脸或三分之二侧脸，动作轻微自然',
    cameraMove: cameraMove || '稳定近景',
    subtitle: cleanText(shot.content).slice(0, 80),
    voiceEmotion: inferPetVoiceEmotion([shot.content, shot.highlight, shot.page].join(' ')),
  }
}

function fitPetShotDurations(shots: PetStoryboardShot[], targetDurationSeconds: number) {
  if (!shots.length) return
  const safeTarget = Number(targetDurationSeconds) || shots.length * 3
  let remaining = safeTarget
  shots.forEach((shot, index) => {
    const remainingShots = shots.length - index
    const duration = clampDuration(Math.round(remaining / remainingShots))
    shot.durationSeconds = duration
    remaining -= duration
  })
}

function clampDuration(value: number) {
  return Math.max(2, Math.min(6, value || 3))
}

function buildPetScriptText(shots: VideoScriptShotItem[]) {
  return shots
    .map((shot, index) => {
      const content = cleanText(shot.content, shot.highlight)
      return content ? `${index + 1}. ${content}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function buildVisualSummary(shots: VideoScriptShotItem[]) {
  return shots
    .map((shot) => cleanText(shot.page, shot.visualPrompt, shot.highlight))
    .filter(Boolean)
    .slice(0, 6)
    .join('；')
}

function extractNamedDialogueSegments(value: string) {
  const text = String(value || '').trim()
  if (!text || text === '无') return []
  const marker = /(^|[\s。！？!?；;])([\u4e00-\u9fffA-Za-z0-9_]{1,8})[：:]\s*/g
  const matches = [...text.matchAll(marker)]
  if (!matches.length) return []
  return matches
    .map((match, index) => {
      const speakerName = String(match[2] || '').trim()
      const start = (match.index || 0) + match[0].length
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length
      return { speakerName, text: cleanDialogueSegment(text.slice(start, end)) }
    })
    .filter((item) => item.speakerName && item.text)
}

function benchmarkRole(name: string, index: number, sourceShots: VideoScriptShotItem[]): PetRole {
  const context = speakerContext(name, sourceShots)
  const type = inferBenchmarkRoleType(name, context, index)
  const voiceName = defaultBenchmarkVoice(type, index)
  return {
    id: `benchmark-role-${String(index + 1).padStart(2, '0')}`,
    name,
    type,
    breed: inferBenchmarkBreed(type, context),
    personalityTags: type === 'cat' ? ['冷静', '机智', '会吐槽'] : type === 'dog' ? ['热情', '积极', '爱撒娇'] : ['温暖', '耐心'],
    speakingTone: type === 'cat' ? '冷静机智' : type === 'dog' ? '活泼真诚' : '温柔自然',
    voiceName,
    roleTags: type === 'other' ? ['人物', '主人'] : ['宠物角色', index === 0 ? '主角' : '搭档'],
    anthropomorphic: type !== 'other',
    referenceAssetIds: [],
  }
}

function speakerContext(name: string, sourceShots: VideoScriptShotItem[]) {
  const chunks = sourceShots.flatMap((shot) => [shot.page, shot.content, shot.highlight, shot.visualPrompt, shot.prompt])
  const windows: string[] = []
  chunks.forEach((chunk) => {
    const text = String(chunk || '')
    let offset = text.indexOf(name)
    while (offset >= 0) {
      windows.push(text.slice(Math.max(0, offset - 16), Math.min(text.length, offset + name.length + 16)))
      offset = text.indexOf(name, offset + name.length)
    }
  })
  return windows.join(' ')
}

function inferBenchmarkRoleType(name: string, context: string, index: number): PetRole['type'] {
  if (/主人|人物|妈妈|爸爸|姐姐|哥哥|林然|owner|human/i.test(name)) return 'other'
  if (/栗子|奶盖/.test(name)) return 'cat'
  if (/豆包|布丁/.test(name)) return 'dog'
  const value = `${name} ${context}`.toLowerCase()
  if (/主人|人物|女孩|男孩|女生|男生|妈妈|爸爸|姐姐|哥哥|林然|owner|human/.test(value)) return 'other'
  if (/小猫|猫咪|猫|英短|美短|布偶|cat|kitten|栗子|奶盖/.test(value)) return 'cat'
  if (/小狗|狗狗|犬|金毛|柯基|柴犬|dog|puppy|豆包|布丁/.test(value)) return 'dog'
  return index % 2 === 0 ? 'cat' : 'dog'
}

function inferBenchmarkBreed(type: PetRole['type'], context: string) {
  if (/金毛/.test(context)) return '金毛犬'
  if (/柯基/.test(context)) return '柯基犬'
  if (/柴犬/.test(context)) return '柴犬'
  if (/英短/.test(context)) return '英国短毛猫'
  if (/美短/.test(context)) return '美国短毛猫'
  if (/布偶/.test(context)) return '布偶猫'
  if (/橘猫/.test(context)) return '橘猫'
  return type === 'cat' ? '猫咪' : type === 'dog' ? '小狗' : '宠物主人'
}

function defaultBenchmarkVoice(type: PetRole['type'], index: number) {
  if (type === 'cat') return index % 2 === 0 ? '清亮女声' : '软萌童声'
  if (type === 'dog') return index % 2 === 0 ? '活泼男声' : '机智少年音'
  return index % 2 === 0 ? '温柔女声' : '沉稳男声'
}

function inferDialogueEmotion(text: string): PetDialogueEmotion {
  if (/惊|突然|竟然|真的吗|怎么/.test(text)) return '惊讶'
  if (/申请|解释|因为|证据|先别|完成/.test(text)) return '认真解释'
  if (/不行|上次|监督|又|只会|明明/.test(text)) return '吐槽'
  if (/求|可以吗|拜托|加餐/.test(text)) return '撒娇'
  if (/委屈|不是我|冤枉/.test(text)) return '委屈'
  return '开心'
}

function cleanDialogueSegment(value: string) {
  return String(value || '')
    .trim()
    .replace(/^[“"']+|[”"']+$/g, '')
    .replace(/[\s。；;]+$/g, '')
    .trim()
}

function inferPetVoiceEmotion(text: string) {
  if (/惊|吓|突然|反转|震惊|慌/.test(text)) return '惊讶'
  if (/撒娇|可爱|卖萌|委屈|求/.test(text)) return '撒娇'
  if (/开心|治愈|温暖|陪伴/.test(text)) return '开心'
  if (/解释|认真|讲解|说明/.test(text)) return '认真解释'
  return '自然'
}

function cleanText(...values: Array<string | null | undefined>) {
  return values
    .map((value) => String(value || '').trim())
    .find((value) => value && value !== '无' && value.toLowerCase() !== 'none') || ''
}
