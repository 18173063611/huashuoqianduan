import type { AssetItem } from '../../types/assetTypes'

type JsonRecord = Record<string, unknown>

const GROUP_PREFIXES: Array<[RegExp, string]> = [
  [/主宠物|宠物主图/, '主宠物参考图'],
  [/第二宠物|多宠物/, '第二宠物参考图'],
  [/人物|数字人/, '宠物主人形象'],
  [/背景|场景/, '宠物场景'],
  [/产品|道具/, '宠物道具'],
  [/音频|配音|旁白/, '宠物音频'],
  [/文案|口播|字幕/, '宠物对话文案'],
  [/分镜|脚本/, '宠物分镜'],
  [/视频|生成结果|成片/, '宠物视频成片'],
]

export function petAssetDisplayName(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const preferredTitle = firstText(
    metadata.displayName,
    metadata.chineseName,
    metadata.workTitle,
    metadata.assetTitle,
    metadata.title,
    metadata.sourceTitle,
  )
  const group = firstText(asset.assetGroup, metadata.assetGroup)
  const sourceType = String(asset.sourceType || '').toUpperCase()
  const fileBase = stripExtension(asset.fileName)
  const searchable = `${preferredTitle} ${fileBase} ${group} ${JSON.stringify(metadata)}`.toLowerCase()

  if (sourceType === 'PET_VIDEO_RESULT' || asset.assetType === 'VIDEO') {
    return namedAsset('宠物视频成片', preferredTitle, asset.assetId)
  }
  if (/文案|口播|字幕/.test(group) || /PET_SCRIPT|VOICE_SCRIPT/.test(sourceType)) {
    return namedAsset('宠物对话文案', preferredTitle || fileBase, asset.assetId)
  }
  if (/分镜|脚本/.test(group) || /STORYBOARD|VIDEO_SCRIPT/.test(sourceType)) {
    return namedAsset('宠物分镜', preferredTitle || fileBase, asset.assetId)
  }

  const prefix = GROUP_PREFIXES.find(([pattern]) => pattern.test(group))?.[1]
    || assetTypePrefix(asset.assetType)
  const detail = asset.assetType === 'IMAGE'
    ? inferImageDetail(searchable, prefix)
    : preferredTitle
  if (detail) return `${prefix}-${compactTitle(detail)}-${asset.assetId}`
  if (containsChinese(fileBase) && !looksTechnical(fileBase)) return compactTitle(fileBase)
  return `${prefix}-${asset.assetId}`
}

export function petAssetTypeLabel(asset: AssetItem) {
  const labels: Record<AssetItem['assetType'], string> = {
    TEXT: '文本文案',
    JSON: '结构化脚本',
    IMAGE: '图片素材',
    AUDIO: '音频素材',
    VIDEO: '视频成片',
    COVER: '封面图片',
  }
  return labels[asset.assetType] || '宠物资产'
}

function namedAsset(prefix: string, title: string, assetId: number) {
  const normalized = cleanTitle(title)
  if (!normalized || looksTechnical(normalized)) return `${prefix}-${assetId}`
  return `${prefix}｜${compactTitle(normalized)}`
}

function inferImageDetail(searchable: string, prefix: string) {
  if (prefix === '宠物主人形象') return '主人参考'
  if (/golden retriever|golden-retriever|金毛/.test(searchable)) return '金毛犬'
  if (/corgi|柯基/.test(searchable)) return '柯基犬'
  if (/shiba|柴犬/.test(searchable)) return '柴犬'
  if (/border collie|边牧/.test(searchable)) return '边境牧羊犬'
  if (/british shorthair|英短/.test(searchable)) return '英国短毛猫'
  if (/ragdoll|布偶/.test(searchable)) return '布偶猫'
  if (/calico|三花/.test(searchable)) return '三花猫'
  if (/white cat|白猫/.test(searchable)) return '白猫'
  if (/orange cat|橘猫/.test(searchable)) return '橘猫'
  if (/主宠物|第二宠物/.test(prefix)) {
    if (/cat|kitten|猫/.test(searchable)) return '猫咪'
    if (/dog|puppy|犬|狗/.test(searchable)) return '小狗'
  }
  if (/living.?room|客厅|沙发/.test(searchable)) return '温暖客厅'
  if (/bedroom|卧室/.test(searchable)) return '居家卧室'
  if (/kitchen|厨房/.test(searchable)) return '家庭厨房'
  if (/park|garden|grass|公园|花园|草地/.test(searchable)) return '户外公园'
  if (/studio|摄影棚/.test(searchable)) return '摄影棚'
  if (/cat|kitten|猫/.test(searchable)) return '猫咪'
  if (/dog|puppy|犬|狗/.test(searchable)) return '小狗'
  return ''
}

function assetTypePrefix(type: AssetItem['assetType']) {
  const labels: Record<AssetItem['assetType'], string> = {
    TEXT: '宠物文案',
    JSON: '宠物结构化脚本',
    IMAGE: '宠物图片',
    AUDIO: '宠物音频',
    VIDEO: '宠物视频成片',
    COVER: '宠物封面',
  }
  return labels[type] || '宠物资产'
}

function parseMetadata(value: string | null): JsonRecord {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {}
  } catch {
    return {}
  }
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const text = String(value).trim()
    if (text && text !== 'undefined' && text !== 'null') return text
  }
  return ''
}

function stripExtension(value: string) {
  return String(value || '').replace(/\.[^.]+$/, '').trim()
}

function cleanTitle(value: string) {
  return stripExtension(value)
    .replace(/^(pet[-_ ]?|宠物[-_ ]?)/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactTitle(value: string) {
  const title = cleanTitle(value)
  return title.length > 28 ? `${title.slice(0, 28)}...` : title
}

function containsChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

function looksTechnical(value: string) {
  return /^(asset|task|work|video|image|result)[-_ ]?\d*$/i.test(value)
    || /^[a-f0-9-]{20,}$/i.test(value)
}
