import type { AssetItem } from '../types/assetTypes'

export const GROUP_BENCHMARK = '爆款对标'
export const GROUP_STORYBOARD = '分镜脚本'
export const CAR_MODEL_BUNDLE_GROUP = '汽车素材包'
export const SCENE_MATERIAL_BUNDLE_GROUP = '场景素材包'

export type AssetWorkflowStageKey =
  | ''
  | 'benchmark'
  | 'storyboard'
  | 'voice'
  | 'digitalHuman'
  | 'video'
  | 'carBundle'
  | 'sceneBundle'
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
  car_interior_steering: '方向盘',
  car_interior_trunk: '后备箱',
  car_detail_sunroof: '天窗',
  car_detail_light: '车灯',
  car_detail_wheel: '轮毂',
  car_detail_logo: 'Logo',
  car_detail_seat_material: '座椅材质',
  scene_showroom: '展厅',
  scene_outdoor: '户外场景',
  scene_road: '道路场景',
  scene_night: '夜景/门店',
  scene_material_bundle: '场景素材包',
  host_image: '数字人形象',
  car_model_bundle: '车型素材包',
  voiceover: '口播',
  bgm: 'BGM',
  reference_audio: '参考音频',
  subtitle: '字幕',
  voice_script: '口播文案',
  storyboard_json: '分镜',
  benchmark_json: '爆款对标',
  asset_integration_package: '资产整合包',
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
  car_exterior_45_degree: 'car_exterior_45',
  dashboard: 'car_interior_dashboard',
  interior: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  rear_seat: 'car_interior_back_seat',
  back_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  instrument: 'car_interior_dashboard',
  dashboard_wheel: 'car_interior_dashboard',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  sunroof: 'car_detail_sunroof',
  panoramic_roof: 'car_detail_sunroof',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  logo: 'car_detail_logo',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  scene: 'scene_showroom',
  road: 'scene_road',
  mountain: 'scene_road',
  highway: 'scene_road',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  scene_outdoor_city: 'scene_outdoor',
  night: 'scene_night',
  store_night: 'scene_night',
  dealership: 'scene_showroom',
  scene_bundle: 'scene_material_bundle',
  scene_material: 'scene_material_bundle',
  scene_material_bundle: 'scene_material_bundle',
  host: 'host_image',
  avatar: 'host_image',
  digital_human: 'host_image',
  car_bundle: 'car_model_bundle',
  model_bundle: 'car_model_bundle',
  car_model: 'car_model_bundle',
  asset_package: 'asset_integration_package',
  asset_reuse_package: 'asset_integration_package',
  reuse_package: 'asset_integration_package',
  reuse_preset: 'asset_integration_package',
  preset_package: 'asset_integration_package',
  integration_package: 'asset_integration_package',
  voice: 'voiceover',
  voice_over: 'voiceover',
  tts: 'voiceover',
  music: 'bgm',
  background_music: 'bgm',
  subtitle_text: 'subtitle',
  reference: 'reference_video',
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
  CAR_MODEL_BUNDLE: '车型配套资产',
  CAR_MODEL_CONTENT: '车型配套资产',
  ASSET_REUSE_PACKAGE: '资产整合包',
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

export type PublicAssetProviderKind = 'developer' | 'user' | 'private'

export function publicAssetProviderKind(asset: AssetItem | null | undefined): PublicAssetProviderKind {
  if (!asset || String(asset.visibility || '').trim().toUpperCase() !== 'PUBLIC') {
    return 'private'
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const provider = firstNonEmptyText(
    stringField(metadata, 'publicAssetProvider'),
    stringField(metadata, 'providerType'),
    stringField(metadata, 'uploadedByType'),
    stringField(metadata, 'assetProvider'),
  ).toLowerCase()
  const publicKind = firstNonEmptyText(
    stringField(metadata, 'publicAssetKind'),
    stringField(metadata, 'libraryKind'),
  ).toLowerCase()
  if (
    provider === 'developer' ||
    provider === 'official' ||
    provider === 'system' ||
    publicKind === 'developer_public' ||
    publicKind === 'official' ||
    metadata?.developerAsset === true ||
    metadata?.officialAsset === true
  ) {
    return 'developer'
  }
  return 'user'
}

export function publicAssetProviderLabel(asset: AssetItem | null | undefined) {
  const kind = publicAssetProviderKind(asset)
  if (kind === 'developer') return '官方资产'
  if (kind === 'user') return '用户公共'
  return '私有资产'
}

export function developerAssetFeatureBadges(asset: AssetItem | null | undefined) {
  if (publicAssetProviderKind(asset) !== 'developer') {
    return []
  }
  const metadata = parseJsonObject(asset?.metadataJson)
  return uniqueNonEmpty([
    carModelHostModeLabel(metadata),
    firstNonEmptyText(
      stringField(metadata, 'videoStyle'),
      stringField(metadata, 'templateStyle'),
      stringField(metadata, 'style'),
    ),
    durationBadge(numberField(metadata, 'durationSeconds')),
    shotCountBadge(numberField(metadata, 'shotCount')),
    aspectRatioBadge(stringField(metadata, 'aspectRatio')),
    languageBadge(stringField(metadata, 'language')),
  ])
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

export function isSceneMaterialBundleAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  if (assetType !== 'JSON' && !asset.fileName.toLowerCase().endsWith('.json')) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return (
    normalizedAssetRole(asset) === 'scene_material_bundle' ||
    stringField(metadata, 'bundleType') === 'scene_material' ||
    String(asset.assetGroup || '').trim() === SCENE_MATERIAL_BUNDLE_GROUP ||
    asset.fileName.includes('场景素材包')
  )
}

export function isSceneReferenceImageAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const mimeType = String(asset.mimeType || '').trim().toLowerCase()
  if (assetType !== 'IMAGE' && assetType !== 'COVER' && !mimeType.startsWith('image/')) {
    return false
  }
  const group = String(asset.assetGroup || '').trim()
  const role = normalizedAssetRole(asset)
  return role.startsWith('scene_') || group === SCENE_MATERIAL_BUNDLE_GROUP
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
  if (stage === 'sceneBundle') {
    return isSceneMaterialBundleAsset(asset) || isSceneReferenceImageAsset(asset)
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
  if (isSceneMaterialBundleAsset(asset)) {
    const metadata = parseJsonObject(asset.metadataJson)
    const title = firstNonEmptyText(
      stringField(metadata, 'sceneSetName'),
      stringField(metadata, 'title'),
      stringField(metadata, 'name'),
    )
    return title ? `场景素材包：${title}` : asset.fileName
  }
  if (isSceneReferenceImageAsset(asset)) {
    return `场景图：${generatedAssetSourceLabel(asset) || asset.fileName}`
  }
  if (isCarModelScriptAsset(asset)) {
    return `车型文案：${libraryAssetDisplayName(asset, '文案') || carModelContentName(asset) || asset.fileName}`
  }
  if (isCarModelStoryboardAsset(asset)) {
    return `车型分镜：${libraryAssetDisplayName(asset, '分镜') || carModelContentName(asset) || asset.fileName}`
  }
  if (isAssetIntegrationPackageAsset(asset)) {
    return `资产整合包：${libraryAssetDisplayName(asset, '整合包') || carModelContentName(asset) || generatedAssetSourceLabel(asset) || asset.fileName}`
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
  if (isSceneMaterialBundleAsset(asset)) {
    const metadata = parseJsonObject(asset.metadataJson)
    const visibilityLabel = String(asset.visibility || '').toUpperCase() === 'PUBLIC' ? '公共素材包' : '私有素材包'
    const imageCount = numberField(metadata, 'imageCount')
    return [
      visibilityLabel,
      '场景素材包',
      imageCount > 0 ? `${imageCount} 张场景图` : '',
      asset.assetType,
      sourceTypeLabel(asset.sourceType),
    ].filter(Boolean).join(' · ')
  }
  if (isSceneReferenceImageAsset(asset)) {
    const visibilityLabel = String(asset.visibility || '').toUpperCase() === 'PUBLIC' ? '公共素材' : '私有素材'
    return [
      visibilityLabel,
      roleDisplayLabel(normalizedAssetRole(asset)) || '场景图',
      asset.assetType,
      sourceTypeLabel(asset.sourceType),
    ].filter(Boolean).join(' · ')
  }
  if (isCarModelScriptAsset(asset) || isCarModelStoryboardAsset(asset)) {
    const metadata = parseJsonObject(asset.metadataJson)
    return [
      publicAssetProviderLabel(asset),
      '车型配套资产',
      isCarModelScriptAsset(asset) ? '文案' : '分镜',
      carModelHostModeLabel(metadata),
      firstNonEmptyText(
        stringField(metadata, 'videoStyle'),
        stringField(metadata, 'templateStyle'),
        stringField(metadata, 'style'),
      ),
      durationBadge(numberField(metadata, 'durationSeconds')),
      asset.assetType,
      sourceTypeLabel(asset.sourceType),
      formatFileSize(asset.fileSize),
    ].filter(Boolean).join(' · ')
  }
  if (isAssetIntegrationPackageAsset(asset)) {
    const metadata = parseJsonObject(asset.metadataJson)
    return [
      publicAssetProviderLabel(asset),
      '资产整合包',
      carModelHostModeLabel(metadata),
      firstNonEmptyText(
        stringField(metadata, 'videoStyle'),
        stringField(metadata, 'templateStyle'),
        stringField(metadata, 'style'),
      ),
      durationBadge(numberField(metadata, 'durationSeconds')),
      shotCountBadge(numberField(metadata, 'shotCount')),
      asset.assetType,
      sourceTypeLabel(asset.sourceType),
      formatFileSize(asset.fileSize),
    ].filter(Boolean).join(' · ')
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
  if (isSceneMaterialBundleAsset(asset)) return '场景素材包'
  if (isSceneReferenceImageAsset(asset)) return '场景图'
  if (isCarModelScriptAsset(asset)) return '文案预览'
  if (isCarModelStoryboardAsset(asset)) return '分镜摘要'
  if (isAssetIntegrationPackageAsset(asset)) return '整合包预览'
  if (isStoryboardAsset(asset)) return '分镜摘要'
  if (isBenchmarkAsset(asset)) return '口播文案'
  return ''
}

function isCarModelScriptAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return stringField(metadata, 'logicalAssetType') === 'script_asset' ||
    stringField(metadata, 'assetType') === 'script_asset'
}

function isCarModelStoryboardAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return stringField(metadata, 'logicalAssetType') === 'storyboard_asset' ||
    stringField(metadata, 'assetType') === 'storyboard_asset'
}

export function isAssetIntegrationPackageAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const role = normalizedAssetRole(asset)
  return role === 'asset_integration_package' ||
    stringField(metadata, 'logicalAssetType') === 'asset_integration_package' ||
    stringField(metadata, 'assetType') === 'asset_integration_package' ||
    stringField(metadata, 'contentKind') === 'asset_reuse_package' ||
    String(asset.sourceType || '').trim().toUpperCase() === 'ASSET_REUSE_PACKAGE' ||
    asset.fileName.includes('资产整合包')
}

function libraryAssetDisplayName(asset: AssetItem, assetKindLabel: string) {
  const metadata = parseJsonObject(asset.metadataJson)
  const explicitName = firstNonEmptyText(
    stringField(metadata, 'displayName'),
    stringField(metadata, 'assetDisplayName'),
    stringField(metadata, 'assetName'),
    stringField(metadata, 'packageName'),
    stringField(metadata, 'title'),
    stringField(metadata, 'name'),
  )
  if (explicitName) {
    return explicitName
  }
  const style = firstNonEmptyText(
    stringField(metadata, 'videoStyle'),
    stringField(metadata, 'templateStyle'),
    stringField(metadata, 'style'),
  )
  const parts = uniqueNonEmpty([
    carModelContentName(asset),
    assetKindLabel,
    carModelHostModeLabel(metadata),
    durationBadge(numberField(metadata, 'durationSeconds')),
    shotCountBadge(numberField(metadata, 'shotCount')),
    aspectRatioBadge(stringField(metadata, 'aspectRatio')),
    style,
    languageBadge(stringField(metadata, 'language')),
  ])
  return parts.join('｜')
}

function carModelContentName(asset: AssetItem) {
  const metadata = parseJsonObject(asset.metadataJson)
  return firstNonEmptyText(
    stringField(metadata, 'carModelName'),
    stringField(metadata, 'sourceCarModelName'),
    stringField(metadata, 'vehicleName'),
    stringField(metadata, 'brandModel'),
    generatedAssetSourceLabel(asset),
  )
}

function carModelHostModeLabel(metadata: Record<string, unknown> | null) {
  const hostMode = firstNonEmptyText(
    stringField(metadata, 'hostMode'),
    stringField(metadata, 'digitalHumanMode'),
  )
  if (hostMode === 'digital_human' || hostMode === 'with_digital_human') return '数字人版'
  if (hostMode === 'no_digital_human' || hostMode === 'vehicle_only') return '无数字人版'
  return ''
}

function durationBadge(seconds: number) {
  return seconds > 0 ? `${seconds}秒` : ''
}

function shotCountBadge(count: number) {
  return count > 0 ? `${count}镜头` : ''
}

function aspectRatioBadge(value: string) {
  return value ? `${value}画幅` : ''
}

function languageBadge(value: string) {
  if (!value) return ''
  const normalized = value.toLowerCase()
  if (normalized === 'zh-cn' || normalized === 'zh') return '中文'
  if (normalized === 'en-us' || normalized === 'en') return '英文'
  return value
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = String(value || '').trim()
    if (text && !seen.has(text)) {
      seen.add(text)
      result.push(text)
    }
  }
  return result
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
  const bundleType = stringField(metadata, 'bundleType').toLowerCase()
  const name = `${asset.fileName || ''} ${stringField(metadata, 'originalFileName')} ${stringField(metadata, 'title')} ${stringField(metadata, 'sourceTitle')}`.toLowerCase()

  if (group === GROUP_BENCHMARK) return 'benchmark_json'
  if (group === GROUP_STORYBOARD) return 'storyboard_json'
  if (group === CAR_MODEL_BUNDLE_GROUP) return 'car_model_bundle'
  if (group === SCENE_MATERIAL_BUNDLE_GROUP && assetType === 'JSON') return 'scene_material_bundle'
  if (sourceType === 'ASSET_REUSE_PACKAGE' || bundleType === 'asset_reuse_package') return 'asset_integration_package'

  if (assetType === 'IMAGE') {
    if (group === SCENE_MATERIAL_BUNDLE_GROUP || from.includes('scene_material') || bundleType === 'scene_material') {
      if (name.includes('road') || name.includes('highway') || name.includes('山路') || name.includes('公路') || name.includes('道路')) return 'scene_road'
      if (name.includes('night') || name.includes('夜景')) return 'scene_night'
      if (name.includes('outdoor') || name.includes('city') || name.includes('户外') || name.includes('城市')) return 'scene_outdoor'
      if (name.includes('showroom') || name.includes('展厅') || name.includes('门店')) return 'scene_showroom'
      return 'scene_showroom'
    }
    if (
      sourceType === 'AVATAR_GENERATE' ||
      from.includes('avatar') ||
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
    if (name.includes('dashboard') || name.includes('interior') || name.includes('内饰') || name.includes('中控') || name.includes('仪表')) return 'car_interior_dashboard'
    if (name.includes('front_seat') || name.includes('前排')) return 'car_interior_front_seat'
    if (name.includes('back_seat') || name.includes('rear_seat') || name.includes('后排')) return 'car_interior_back_seat'
    if (name.includes('steering') || name.includes('方向盘')) return 'car_interior_steering'
    if (name.includes('trunk') || name.includes('后备箱')) return 'car_interior_trunk'
    if (name.includes('sunroof') || name.includes('panoramic_roof') || name.includes('天窗') || name.includes('全景天幕')) return 'car_detail_sunroof'
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
    if (bundleType === 'scene_material') return 'scene_material_bundle'
    if (name.includes('asset_integration_package') || name.includes('asset_reuse_package') || name.includes('资产整合包')) return 'asset_integration_package'
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

function numberField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
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
