import type { AssetItem } from '../types/assetTypes'

export const GROUP_BENCHMARK = '爆款对标'
export const GROUP_STORYBOARD = '分镜脚本'
export const CAR_MODEL_BUNDLE_GROUP = '汽车素材包'

export type AssetWorkflowStageKey =
  | ''
  | 'benchmark'
  | 'storyboard'
  | 'voice'
  | 'digitalHuman'
  | 'video'
  | 'carBundle'
  | 'material'

const ROLE_LABELS: Record<string, string> = {
  car_exterior_front: '外观正面',
  car_exterior_side: '外观侧面',
  car_exterior_rear: '外观背面',
  car_exterior_45: '外观 45 度',
  car_exterior_45_degree: '外观 45 度',
  car_interior_dashboard: '内饰中控',
  car_interior_front_seat: '内饰前排',
  car_interior_back_seat: '内饰后排',
  car_interior_steering: '方向盘/仪表',
  car_interior_trunk: '后备箱',
  car_detail_light: '车灯',
  car_detail_wheel: '轮毂',
  car_detail_logo: 'Logo',
  car_detail_seat_material: '座椅材质',
  scene_showroom: '展厅',
  scene_outdoor: '户外场景',
  scene_road: '道路场景',
  scene_night: '夜景/门店',
  host_image: '数字人形象',
  car_model_bundle: '车型素材包',
  voiceover: '口播',
  bgm: 'BGM',
  reference_audio: '参考音频',
  subtitle: '字幕',
  voice_script: '口播文案',
  storyboard_json: '分镜',
  benchmark_json: '爆款对标',
  material_video: '视频素材',
  host_video: '数字人视频',
  reference_video: '参考视频',
}

const ROLE_ALIASES: Record<string, string> = {
  benchmark: 'benchmark_json',
  douyin_benchmark: 'benchmark_json',
  benchmark_extract: 'benchmark_json',
  benchmark_extraction: 'benchmark_json',
  douyin_benchmark_extract: 'benchmark_json',
  douyin_benchmark_extraction: 'benchmark_json',
  storyboard: 'storyboard_json',
  script_storyboard: 'storyboard_json',
  storyboard_script: 'storyboard_json',
  front: 'car_exterior_front',
  exterior_front: 'car_exterior_front',
  car_front: 'car_exterior_front',
  side: 'car_exterior_side',
  exterior_side: 'car_exterior_side',
  rear: 'car_exterior_rear',
  back: 'car_exterior_rear',
  exterior_rear: 'car_exterior_rear',
  '45': 'car_exterior_45',
  '45_degree': 'car_exterior_45',
  dashboard: 'car_interior_dashboard',
  interior: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  rear_seat: 'car_interior_back_seat',
  back_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  scene: 'scene_showroom',
  road: 'scene_road',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  night: 'scene_night',
  dealership: 'scene_showroom',
  host: 'host_image',
  avatar: 'host_image',
  car_bundle: 'car_model_bundle',
  model_bundle: 'car_model_bundle',
  car_model: 'car_model_bundle',
  voice: 'voiceover',
  voice_over: 'voiceover',
  tts: 'voiceover',
  music: 'bgm',
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  AI_GENERATED: 'AI 生成',
  DEMO: '演示素材',
  MANUAL_CREATED: '手动创建',
  SYSTEM_MOCK: '系统示例',
  USER_UPLOAD: '上传素材',
  SCRIPT_REWRITE: '文案改写',
  STORYBOARD_GENERATE: '分镜生成',
  VIDEO_PARSE: '视频理解',
  VIDEO_SCRIPT_ANALYZE: '分镜生成',
  VIDEO_SCRIPT_URL_ANALYZE: '链接分镜',
  DOUYIN_BENCHMARK: '爆款对标',
  DOUYIN_BENCHMARK_EXTRACT: '爆款对标',
  DOUYIN_PARSE_TRANSCRIPT: '爆款对标转写',
  DOUYIN_REWRITE: '爆款文案改写',
  DOUYIN_TRANSCRIPT: '爆款口播转写',
  TTS_GENERATE: '声音生成',
  VOICE_SAMPLE: '声音试音',
  AVATAR_GENERATE: '数字人形象',
  DIGITAL_HUMAN_GENERATE: '数字人视频',
  SEEDANCE_TEXT_VIDEO: '文生视频',
  SEEDANCE_FIRST_FRAME_VIDEO: '图生视频',
  SEEDANCE_FIRST_LAST_FRAME_VIDEO: '图生视频',
  SEEDANCE_REFERENCE_VIDEO: '图生视频',
  SEEDANCE_CAR_SALES_VIDEO: '汽车销售成片',
  TEXT_TO_VIDEO_SEEDANCE_1_5: '文生视频',
  TEXT_TO_VIDEO_SEEDANCE_2_0: '文生视频',
  IMAGE_TO_VIDEO_SEEDANCE_1_5: '图生视频',
  IMAGE_TO_VIDEO_SEEDANCE_2_0: '图生视频',
  IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST: '图生视频',
}

export function normalizeAssetRole(role: string | null | undefined) {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized ? ROLE_ALIASES[normalized] || normalized : ''
}

export function roleDisplayLabel(role: string | null | undefined) {
  const normalized = normalizeAssetRole(role)
  return normalized ? ROLE_LABELS[normalized] || normalized : ''
}

export function sourceTypeLabel(sourceType: string | null | undefined) {
  const key = String(sourceType || '').trim().toUpperCase()
  return SOURCE_TYPE_LABELS[key] || key || '未知来源'
}

export function normalizedAssetRole(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const explicit = normalizeAssetRole(firstNonEmptyText(stringField(metadata, 'assetRole'), stringField(metadata, 'role')))
  if (explicit) {
    return explicit
  }
  return inferAssetRole(asset, metadata)
}

export function isBenchmarkAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const group = String(asset.assetGroup || '').trim()
  const role = normalizedAssetRole(asset)
  const fileName = asset.fileName.toLowerCase()
  if (role === 'storyboard_json' || group === GROUP_STORYBOARD) {
    return false
  }
  return (
    sourceType.includes('DOUYIN') ||
    role === 'benchmark_json' ||
    role === 'voice_script' ||
    group === GROUP_BENCHMARK ||
    (isText(asset) && (fileName.includes('口播文案') || fileName.includes('爆款对标')))
  )
}

export function isStoryboardAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const group = String(asset.assetGroup || '').trim()
  const role = normalizedAssetRole(asset)
  const fileName = asset.fileName.toLowerCase()
  if (role === 'benchmark_json' || role === 'voice_script' || group === GROUP_BENCHMARK) {
    return false
  }
  return (
    sourceType === 'STORYBOARD_GENERATE' ||
    sourceType === 'VIDEO_SCRIPT_ANALYZE' ||
    sourceType === 'VIDEO_SCRIPT_URL_ANALYZE' ||
    role === 'storyboard_json' ||
    group === GROUP_STORYBOARD ||
    fileName.includes('分镜')
  )
}

export function isCarModelBundleAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  if (assetType !== 'JSON' && !asset.fileName.toLowerCase().endsWith('.json')) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return (
    normalizedAssetRole(asset) === 'car_model_bundle' ||
    stringField(metadata, 'bundleType') === 'car_model' ||
    String(asset.assetGroup || '').trim() === CAR_MODEL_BUNDLE_GROUP ||
    asset.fileName.includes('车型素材包')
  )
}

export function matchesAssetWorkflowStage(asset: AssetItem, stage: AssetWorkflowStageKey | null | undefined) {
  if (!stage) {
    return true
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  if (stage === 'benchmark') {
    return isBenchmarkAsset(asset)
  }
  if (stage === 'storyboard') {
    return isStoryboardAsset(asset)
  }
  if (stage === 'carBundle') {
    return isCarModelBundleAsset(asset)
  }
  if (stage === 'voice') {
    return ['TTS_GENERATE', 'VOICE_SAMPLE'].includes(sourceType) || (asset.assetType === 'AUDIO' && sourceType === 'AI_GENERATED')
  }
  if (stage === 'digitalHuman') {
    return ['AVATAR_GENERATE', 'DIGITAL_HUMAN_GENERATE'].includes(sourceType)
  }
  if (stage === 'video') {
    return [
      'SEEDANCE_TEXT_VIDEO',
      'SEEDANCE_FIRST_FRAME_VIDEO',
      'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
      'SEEDANCE_REFERENCE_VIDEO',
      'SEEDANCE_CAR_SALES_VIDEO',
      'TEXT_TO_VIDEO_SEEDANCE_1_5',
      'TEXT_TO_VIDEO_SEEDANCE_2_0',
      'IMAGE_TO_VIDEO_SEEDANCE_1_5',
      'IMAGE_TO_VIDEO_SEEDANCE_2_0',
      'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
    ].includes(sourceType)
  }
  if (stage === 'material') {
    return ['USER_UPLOAD', 'MANUAL_CREATED', 'DEMO', 'AI_GENERATED'].includes(sourceType)
  }
  return true
}

export function assetWorkflowDisplayTitle(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  if (isCarModelBundleAsset(asset)) {
    const metadata = parseJsonObject(asset.metadataJson)
    const title = [stringField(metadata, 'brandModel'), stringField(metadata, 'color')].filter(Boolean).join(' · ')
    return title ? `车型素材包：${title}` : asset.fileName
  }
  if (isStoryboardAsset(asset)) {
    return `分镜：${generatedAssetSourceLabel(asset) || asset.fileName}`
  }
  if (isBenchmarkAsset(asset)) {
    return `爆款对标：${generatedAssetSourceLabel(asset) || asset.fileName}`
  }
  return ''
}

export function assetWorkflowDisplayMeta(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  if (isCarModelBundleAsset(asset)) {
    const visibilityLabel = String(asset.visibility || '').toUpperCase() === 'PUBLIC' ? '公共素材包' : '私有素材包'
    return `${visibilityLabel} · JSON · ${sourceTypeLabel(asset.sourceType)}`
  }
  if (isBenchmarkAsset(asset) || isStoryboardAsset(asset)) {
    const sourceLabel = generatedAssetSourceLabel(asset)
    return [
      '生成结果',
      isBenchmarkAsset(asset) ? '爆款对标' : '分镜生成',
      sourceLabel ? `解析视频：${sourceLabel}` : '',
      asset.assetType,
      formatFileSize(asset.fileSize),
    ].filter(Boolean).join(' · ')
  }
  return ''
}

export function assetWorkflowPreviewLabel(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  if (isCarModelBundleAsset(asset)) return '车型素材包'
  if (isStoryboardAsset(asset)) return '分镜摘要'
  if (isBenchmarkAsset(asset)) return '口播文案'
  return ''
}

export function generatedAssetSourceLabel(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return compactSourceLabel(firstNonEmptyText(
    stringField(metadata, 'sourceTitle'),
    stringField(metadata, 'title'),
    stringField(metadata, 'originalFileName'),
    stringField(metadata, 'sourceUrl'),
    stringField(metadata, 'originalUrl'),
    stringField(metadata, 'shareUrl'),
    stringField(metadata, 'url'),
    stringField(metadata, 'videoId'),
    stringField(metadata, 'playUrl'),
  ))
}

function inferAssetRole(asset: AssetItem, metadata: Record<string, unknown> | null) {
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const group = String(asset.assetGroup || '').trim()
  const from = stringField(metadata, 'from').toLowerCase()
  const source = stringField(metadata, 'source').toUpperCase()
  const bundleType = stringField(metadata, 'bundleType').toLowerCase()
  const name = `${asset.fileName || ''} ${stringField(metadata, 'originalFileName')} ${stringField(metadata, 'title')} ${stringField(metadata, 'sourceTitle')}`.toLowerCase()

  if (group === GROUP_BENCHMARK) return 'benchmark_json'
  if (group === GROUP_STORYBOARD) return 'storyboard_json'
  if (group === CAR_MODEL_BUNDLE_GROUP) return 'car_model_bundle'

  if (assetType === 'IMAGE') {
    if (
      sourceType === 'AVATAR_GENERATE' ||
      from.includes('avatar') ||
      source === 'DOUBAO_SEEDREAM' ||
      name.includes('avatar') ||
      name.includes('host') ||
      name.includes('主播') ||
      name.includes('数字人') ||
      Boolean(stringField(metadata, 'avatarName'))
    ) {
      return 'host_image'
    }
    if (name.includes('side') || name.includes('侧面') || name.includes('车侧')) return 'car_exterior_side'
    if (name.includes('rear') || name.includes('back') || name.includes('尾部') || name.includes('车尾') || name.includes('背面')) return 'car_exterior_rear'
    if (name.includes('45')) return 'car_exterior_45'
    if (name.includes('dashboard') || name.includes('interior') || name.includes('内饰') || name.includes('中控')) return 'car_interior_dashboard'
    if (name.includes('front_seat') || name.includes('前排')) return 'car_interior_front_seat'
    if (name.includes('back_seat') || name.includes('rear_seat') || name.includes('后排')) return 'car_interior_back_seat'
    if (name.includes('steering') || name.includes('方向盘') || name.includes('仪表')) return 'car_interior_steering'
    if (name.includes('trunk') || name.includes('后备箱')) return 'car_interior_trunk'
    if (name.includes('wheel') || name.includes('轮毂') || name.includes('轮胎')) return 'car_detail_wheel'
    if (name.includes('logo') || name.includes('车标') || name.includes('标识')) return 'car_detail_logo'
    if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
    if (name.includes('seat') || name.includes('座椅') || name.includes('材质')) return 'car_detail_seat_material'
    if (name.includes('showroom') || name.includes('展厅') || name.includes('门店')) return 'scene_showroom'
    if (name.includes('road') || name.includes('highway') || name.includes('山路') || name.includes('公路') || name.includes('道路')) return 'scene_road'
    if (name.includes('night') || name.includes('夜景')) return 'scene_night'
    if (name.includes('outdoor') || name.includes('city') || name.includes('户外') || name.includes('城市')) return 'scene_outdoor'
    if (name.includes('front') || name.includes('car') || name.includes('车头') || name.includes('正面') || name.includes('外观')) return 'car_exterior_front'
    return ''
  }

  if (assetType === 'JSON') {
    if (bundleType === 'car_model') return 'car_model_bundle'
    if (hasStoryboardTextSignal(name)) return 'storyboard_json'
    if (hasBenchmarkTextSignal(name)) return 'benchmark_json'
    if (['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'].includes(sourceType)) return 'storyboard_json'
    if (['DOUYIN_BENCHMARK', 'DOUYIN_BENCHMARK_EXTRACT', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'].includes(sourceType)) return 'benchmark_json'
  }

  if (assetType === 'TEXT') {
    if (name.includes('subtitle') || name.includes('srt') || name.includes('字幕')) return 'subtitle'
    if (sourceType.includes('DOUYIN') || name.includes('script') || name.includes('文案') || name.includes('口播') || name.includes('爆款')) return 'voice_script'
  }

  if (assetType === 'AUDIO') {
    if (name.includes('bgm') || name.includes('music') || name.includes('背景音乐')) return 'bgm'
    if (name.includes('ref') || name.includes('reference') || name.includes('参考音频')) return 'reference_audio'
    if (['TTS_GENERATE', 'VOICE_SAMPLE', 'AI_GENERATED'].includes(sourceType) || name.includes('voice') || name.includes('口播') || name.includes('配音')) return 'voiceover'
  }

  if (assetType === 'VIDEO' && sourceType === 'DIGITAL_HUMAN_GENERATE') return 'host_video'
  if (assetType === 'VIDEO') {
    if (name.includes('host') || name.includes('avatar') || name.includes('主播') || name.includes('口播') || name.includes('数字人')) return 'host_video'
    if (name.includes('ref') || name.includes('reference') || name.includes('benchmark') || name.includes('对标')) return 'reference_video'
    return 'material_video'
  }
  return ''
}

function isText(asset: AssetItem) {
  return (
    String(asset.assetType || '').toUpperCase() === 'TEXT' ||
    String(asset.mimeType || '').toLowerCase().startsWith('text/') ||
    /\.(txt|md)$/i.test(asset.fileName)
  )
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function firstNonEmptyText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || ''
}

function hasStoryboardTextSignal(text: string) {
  return (
    text.includes('storyboard') ||
    text.includes('video-script') ||
    text.includes('video_script') ||
    text.includes('分镜')
  )
}

function hasBenchmarkTextSignal(text: string) {
  return (
    text.includes('benchmark') ||
    text.includes('爆款') ||
    text.includes('对标') ||
    text.includes('口播文案') ||
    text.includes('提取文案')
  )
}

function compactSourceLabel(value: string) {
  const text = value.trim()
  if (text.length <= 56) {
    return text
  }
  return `${text.slice(0, 34)}...${text.slice(-16)}`
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
