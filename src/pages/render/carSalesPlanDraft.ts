import { getBillingEstimate } from '../../services/creditApi'
import { uploadMaterialAsset } from '../../services/assetApi'
import { generateStoryboard, rewriteScript } from '../../services/scriptApi'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { BillingEstimateResponse } from '../../types/creditTypes'
import type { StoryboardShotItem } from '../../types/scriptTypes'
import type { QuickRenderAssetRole, QuickRenderRequest } from '../../types/videoTypes'

export type CarSalesPlanSource = 'ai-smart' | 'benchmark' | 'asset-reuse'

export interface AiPlanStoryboardShot {
  index: number
  visual: string
  narration: string
  duration: number
}

export interface AiPlanPreview {
  script: string
  scriptFallback: boolean
  storyboard: AiPlanStoryboardShot[]
  storyboardFallback: boolean
  estimatedCredits: number
  balance: number | null
  enoughBalance: boolean | null
  estimatedDuration: string
  totalDuration: number
  segmentCount: number
  materialCount: number
  vehicleMaterialCount: number
  configItems: string[]
  warnings: string[]
}

export interface CarSalesPlanDraftAsset {
  assetId: number
  fileName: string
  assetType: AssetType | string
  mimeType?: string | null
  fileUrl?: string | null
  thumbnailUrl?: string | null
  metadataJson?: string | null
  role: QuickRenderAssetRole
  textContent?: string
}

export interface CarSalesPlanDraft {
  source: CarSalesPlanSource
  prompt: string
  title?: string
  referenceUrl?: string
  coverAssetId?: number | null
  coverUrl?: string
  script?: string
  storyboard?: AiPlanStoryboardShot[]
  assets: CarSalesPlanDraftAsset[]
  aspectRatio: '9:16' | '16:9' | 'auto'
  subtitleMode: 'off' | 'auto' | 'upload'
  subtitleLanguage?: string
  nativeVoiceLanguage?: string
  nativeVoiceStyle?: string
  nativeSpeechStyle?: string
  burnInSubtitle: boolean
  customSubtitle?: string
  audioPolicy: 'auto' | 'none' | 'voiceover' | 'bgm'
  model: string
  segmentCount: number
  segmentDuration: number
  hostAppearanceEnabled?: boolean
  headlineOverlay?: QuickRenderRequest['headlineOverlay']
  subtitleOverlay?: QuickRenderRequest['subtitleOverlay']
  configItems?: string[]
  warnings?: string[]
}

export function planAssetFromAssetItem(
  asset: AssetItem,
  role: QuickRenderAssetRole,
  textContent?: string,
): CarSalesPlanDraftAsset {
  return {
    assetId: asset.assetId,
    fileName: asset.fileName,
    assetType: asset.assetType,
    mimeType: asset.mimeType,
    fileUrl: asset.fileUrl,
    thumbnailUrl: asset.thumbnailUrl,
    metadataJson: asset.metadataJson,
    role,
    textContent,
  }
}

export async function prepareCarSalesAiPlanPreview(draft: CarSalesPlanDraft): Promise<AiPlanPreview> {
  const warnings = [...(draft.warnings || [])]
  const estimate = await fetchPlanBillingEstimate(draft, warnings)
  const shouldUseLocalPlanOnly = estimate?.enoughBalance === false

  let scriptFallback = false
  let storyboardFallback = false
  let script = draft.script?.trim() || ''
  let scriptVersionId: number | null = null

  if (shouldUseLocalPlanOnly) {
    scriptFallback = true
    storyboardFallback = true
    warnings.push('当前积分余额不足，已跳过 AI 文案与分镜接口，使用本地方案预览。')
    script = scriptMatchesTargetLanguage(script, draft.nativeVoiceLanguage) ? script : buildFallbackPlanScript(draft)
  } else if (script && scriptMatchesTargetLanguage(script, draft.nativeVoiceLanguage)) {
    scriptFallback = false
  } else {
    try {
      const rewritten = await rewriteScript({
        sourceText: buildPlanSourceText(draft),
        style: rewriteStyleBySource(draft.source, draft.nativeVoiceLanguage),
        targetLength: Math.min(900, Math.max(260, draft.segmentCount * 140)),
      })
      const rewrittenText = rewritten.rewrittenText || ''
      const fallbackScript = buildFallbackPlanScript(draft)
      script = scriptMatchesTargetLanguage(rewrittenText, draft.nativeVoiceLanguage)
        ? rewrittenText
        : fallbackScript
      scriptVersionId = rewritten.scriptVersionId || null
      scriptFallback = !rewrittenText || script === fallbackScript
    } catch (error) {
      scriptFallback = true
      script = buildFallbackPlanScript(draft)
      warnings.push(`文案生成失败，已使用本地方案：${errorMessageFrom(error)}`)
    }
  }

  let storyboard = draft.storyboard?.length ? draft.storyboard : []
  if (!storyboard.length && !shouldUseLocalPlanOnly && scriptVersionId) {
    try {
      const response = await generateStoryboard({ scriptVersionId })
      storyboard = normalizeStoryboardShots(response.storyboard, draft)
      storyboardFallback = !storyboard.length
    } catch (error) {
      storyboardFallback = true
      warnings.push(`分镜生成失败，已使用本地分镜：${errorMessageFrom(error)}`)
    }
  }
  if (!storyboard.length) {
    storyboardFallback = true
    storyboard = buildFallbackStoryboard(script, draft)
  }

  return {
    script,
    scriptFallback,
    storyboard,
    storyboardFallback,
    estimatedCredits: estimate?.estimatedCreditCost ?? 20,
    balance: estimate?.balance ?? null,
    enoughBalance: estimate?.enoughBalance ?? null,
    estimatedDuration: estimatedRenderDurationLabel(draft),
    totalDuration: draft.segmentCount * draft.segmentDuration,
    segmentCount: draft.segmentCount,
    materialCount: draft.assets.length,
    vehicleMaterialCount: vehicleMaterialCount(draft),
    configItems: buildPlanConfigItems(draft),
    warnings,
  }
}

export async function ensureCarSalesPlanDraftAsset(draft: CarSalesPlanDraft, plan: AiPlanPreview): Promise<CarSalesPlanDraft> {
  const planAssetRole: QuickRenderAssetRole = draft.source === 'benchmark' ? 'benchmark_json' : 'storyboard_json'
  if (draft.assets.some((asset) => asset.role === planAssetRole)) {
    return draft
  }

  const content = JSON.stringify({
    source: draft.source,
    title: draft.title,
    prompt: draft.prompt,
    referenceUrl: draft.referenceUrl,
    coverUrl: draft.coverUrl,
    script: plan.script,
    storyboard: plan.storyboard,
    configItems: plan.configItems,
    createdAt: new Date().toISOString(),
  }, null, 2)
  const fileName = `${draft.source === 'benchmark' ? 'benchmark' : 'car-sales'}-plan-${Date.now()}.json`
  const file = new File([content], fileName, { type: 'application/json' })
  const asset = await uploadMaterialAsset(file, {
    metadataJson: JSON.stringify({
      from: 'car_sales_plan_draft',
      assetRole: draft.source === 'benchmark' ? 'benchmark_json' : 'storyboard_json',
      assetGroup: draft.source === 'benchmark' ? 'benchmark_template' : 'storyboard_template',
      source: draft.source,
      sourceUrl: draft.referenceUrl || undefined,
      coverUrl: draft.coverUrl || undefined,
      title: draft.title || undefined,
      createdBy: 'unified_car_sales_plan',
    }),
  })

  return {
    ...draft,
    assets: [
      ...draft.assets,
      planAssetFromAssetItem(asset, planAssetRole, content),
    ],
  }
}

export function buildQuickRenderRequestFromPlanDraft(
  draft: CarSalesPlanDraft,
  plan: AiPlanPreview,
): QuickRenderRequest {
  const script = plan.script.trim()
  const coverAsset = draftCoverAsset(draft)
  const coverUrl = draft.coverUrl || assetCoverUrl(coverAsset)
  return {
    intent: 'car_sales',
    assetIds: draft.assets.map((item) => item.assetId),
    assetRoles: Object.fromEntries(draft.assets.map((item) => [String(item.assetId), item.role])),
    assetTextContents: Object.fromEntries(
      draft.assets
        .filter((item) => item.textContent && item.textContent.trim())
        .map((item) => [String(item.assetId), item.textContent || '']),
    ),
    coverAssetId: draft.coverAssetId || coverAsset?.assetId || null,
    coverUrl: coverUrl || undefined,
    aspectRatio: draft.aspectRatio,
    subtitleMode: draft.subtitleMode,
    subtitleLanguage: draft.subtitleLanguage,
    nativeVoiceLanguage: draft.nativeVoiceLanguage || 'zh-CN',
    nativeVoiceStyle: draft.nativeVoiceStyle || 'natural_sales',
    nativeSpeechStyle: draft.nativeSpeechStyle || 'balanced',
    burnInSubtitle: draft.subtitleMode !== 'off' && draft.burnInSubtitle,
    customSubtitle: draft.subtitleMode === 'upload' ? draft.customSubtitle || undefined : undefined,
    finalVoiceText: script || undefined,
    strictVoiceText: Boolean(script),
    audioPolicy: draft.audioPolicy,
    model: draft.model,
    segmentCount: draft.segmentCount,
    segmentDuration: draft.segmentDuration,
    goalText: buildGoalTextForRequest(draft, plan),
    outputPurpose: 'car_sales_video',
    hostAppearanceEnabled: Boolean(draft.hostAppearanceEnabled),
    subtitleOverlay: draft.subtitleOverlay,
    headlineOverlay: draft.headlineOverlay,
  }
}

function draftCoverAsset(draft: CarSalesPlanDraft) {
  if (draft.coverAssetId) {
    const explicit = draft.assets.find((item) => item.assetId === draft.coverAssetId)
    if (explicit) return explicit
  }
  return draft.assets.find((item) => item.role === 'car_model_bundle' && assetCoverUrl(item))
    || draft.assets.find((item) => item.role.startsWith('car_') && assetCoverUrl(item))
    || draft.assets.find((item) => item.role.startsWith('scene_') && assetCoverUrl(item))
    || draft.assets.find((item) => assetCoverUrl(item))
    || null
}

function assetCoverUrl(asset: CarSalesPlanDraftAsset | null | undefined) {
  if (!asset) return ''
  const metadata = parseMetadataObject(asset.metadataJson)
  return asset.thumbnailUrl
    || metadataText(metadata, 'thumbnailUrl')
    || metadataText(metadata, 'coverUrl')
    || metadataText(metadata, 'firstFrameUrl')
    || (asset.assetType === 'IMAGE' || asset.assetType === 'COVER' ? asset.fileUrl || '' : '')
}

function parseMetadataObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function metadataText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function buildPlanSourceText(draft: CarSalesPlanDraft) {
  return [
    sourceLabel(draft.source),
    draft.title ? `标题：${draft.title}` : '',
    draft.prompt ? `用户需求：${draft.prompt}` : '',
    draft.referenceUrl ? `参考链接：${draft.referenceUrl}` : '',
    draft.assets.length ? `已选素材：${draft.assets.map((item) => `${item.fileName}(${roleLabel(item.role)})`).join('；')}` : '',
    `生成参数：${draft.segmentCount * draft.segmentDuration} 秒，${draft.segmentCount} 段，比例 ${draft.aspectRatio}`,
    draft.nativeVoiceLanguage === 'en-US'
      ? 'Voice language: English voiceover only. Return natural English narration and avoid Chinese copy.'
      : '',
  ].filter(Boolean).join('\n')
}

function buildGoalTextForRequest(draft: CarSalesPlanDraft, plan: AiPlanPreview) {
  return [
    draft.prompt || draft.title || sourceLabel(draft.source),
    draft.referenceUrl ? `参考链接：${draft.referenceUrl}` : '',
    plan.configItems.length ? `方案配置：${plan.configItems.join('，')}` : '',
  ].filter(Boolean).join('\n')
}

function buildFallbackPlanScript(draft: CarSalesPlanDraft) {
  if (draft.nativeVoiceLanguage === 'en-US') {
    return buildEnglishFallbackPlanScript(draft)
  }
  const base = draft.prompt || draft.title || '帮我生成一条汽车销售短视频'
  if (draft.source === 'benchmark') {
    return [
      '开场抓住爆款结构：用强卖点或真实用车场景快速吸引注意。',
      `主体承接用户需求：${base}`,
      '中段突出车辆空间、外观、智能配置和到店权益，保持节奏紧凑。',
      '结尾加入行动号召：欢迎到店试驾，了解更多车型优惠。',
    ].join('\n')
  }
  if (draft.source === 'asset-reuse') {
    return [
      '开场使用已选资产建立车型记忆点。',
      `围绕本次目标组织口播：${base}`,
      '结合文案、分镜、数字人、BGM 和车辆素材形成完整销售短片。',
      '结尾提醒用户咨询门店或预约试驾。',
    ].join('\n')
  }
  return [
    `请围绕“${base}”生成汽车销售短视频。`,
    '先展示车型第一视觉，再突出核心卖点，最后给出门店行动号召。',
  ].join('\n')
}

function buildEnglishFallbackPlanScript(draft: CarSalesPlanDraft) {
  const base = englishSafeText(draft.prompt || draft.title || '', 'the selected SUV sales story')
  if (draft.source === 'benchmark') {
    return [
      'Open with a strong hook inspired by the reference video structure.',
      `Adapt the core sales message for this goal: ${base}`,
      'Show the vehicle package, cabin space, comfort details, smart features, and showroom benefits in a clear rhythm.',
      'Close with a direct call to action: book a test drive or visit the dealership for the latest offer.',
    ].join('\n')
  }
  if (draft.source === 'asset-reuse') {
    return [
      'Start with the selected vehicle assets and establish a premium first impression.',
      `Build the English voiceover around this goal: ${base}`,
      'Combine the script, storyboard, digital human option, background music, and vehicle package into a complete sales video.',
      'End by inviting viewers to contact the showroom or schedule a test drive.',
    ].join('\n')
  }
  return [
    `Create an automotive sales video based on this goal: ${base}`,
    'Lead with the vehicle hero shot, explain the key selling points, and finish with a showroom visit or test drive call to action.',
  ].join('\n')
}

function englishSafeText(value: string, fallback: string) {
  const text = value.trim()
  return text && !/[\u4E00-\u9FFF]/.test(text) ? text : fallback
}

function scriptMatchesTargetLanguage(script: string, language: string | undefined) {
  const text = script.trim()
  if (!text) return false
  if (language === 'en-US') {
    return !/[\u4E00-\u9FFF]/.test(text) && /[A-Za-z]/.test(text)
  }
  return true
}

function buildFallbackStoryboard(script: string, draft: CarSalesPlanDraft): AiPlanStoryboardShot[] {
  const lines = script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const visuals = [
    '车辆外观主视觉，镜头从车头推进到车侧。',
    '展示内饰、中控和座舱空间，突出舒适与智能。',
    '切换门店或道路场景，呈现真实使用氛围。',
    '收束到到店咨询或试驾预约画面。',
  ]
  return Array.from({ length: draft.segmentCount }).map((_, index) => ({
    index: index + 1,
    visual: visuals[index % visuals.length],
    narration: lines[index] || lines[lines.length - 1] || draft.prompt || '汽车销售短视频',
    duration: draft.segmentDuration,
  }))
}

function normalizeStoryboardShots(shots: StoryboardShotItem[] | undefined, draft: CarSalesPlanDraft) {
  return (shots || []).slice(0, draft.segmentCount).map((shot, index) => ({
    index: shot.index || index + 1,
    visual: shot.visual || '车辆销售画面',
    narration: shot.narration || draft.prompt || '汽车销售口播',
    duration: Math.max(1, Math.round(shot.estDurationSec || draft.segmentDuration)),
  }))
}

async function fetchPlanBillingEstimate(draft: CarSalesPlanDraft, warnings: string[]) {
  try {
    return await getBillingEstimate({
      taskType: 'SEEDANCE_CAR_SALES_VIDEO',
      modelCode: draft.model === 'auto' ? undefined : draft.model,
      imageCount: vehicleMaterialCount(draft),
      segmentCount: draft.segmentCount,
      durationSeconds: draft.segmentCount * draft.segmentDuration,
    })
  } catch (error) {
    warnings.push(`积分估算失败，暂按 20 积分展示：${errorMessageFrom(error)}`)
    return null as BillingEstimateResponse | null
  }
}

function vehicleMaterialCount(draft: CarSalesPlanDraft) {
  return draft.assets.filter((item) => item.role === 'car_model_bundle' || item.role.startsWith('car_') || item.role.startsWith('scene_')).length
}

function estimatedRenderDurationLabel(draft: CarSalesPlanDraft) {
  if (draft.hostAppearanceEnabled) return '3-8 分钟'
  if (draft.segmentCount >= 4 || draft.segmentCount * draft.segmentDuration >= 20) return '2-5 分钟'
  return '1-2 分钟'
}

function buildPlanConfigItems(draft: CarSalesPlanDraft) {
  const items = [
    `比例 ${draft.aspectRatio}`,
    `${draft.segmentCount * draft.segmentDuration} 秒`,
    `${draft.segmentCount} 段`,
    draft.nativeVoiceLanguage === 'en-US' ? '英文讲述' : '中文讲述',
    `字幕 ${subtitleModeLabel(draft.subtitleMode)}`,
    `音频 ${audioPolicyLabel(draft.audioPolicy)}`,
  ]
  if (draft.source === 'benchmark') items.push('爆款结构复用')
  if (draft.source === 'asset-reuse') items.push('资产复用')
  if (draft.hostAppearanceEnabled) items.push('数字人出镜')
  if (draft.headlineOverlay?.enabled) items.push('大字报')
  if (draft.model !== 'auto') items.push(`模型 ${draft.model}`)
  return [...items, ...(draft.configItems || [])]
}

function rewriteStyleBySource(source: CarSalesPlanSource, language?: string) {
  const languagePrefix = language === 'en-US' ? 'English voiceover, English subtitles, ' : ''
  if (source === 'benchmark') return `${languagePrefix}爆款汽车销售短视频`
  if (source === 'asset-reuse') return `${languagePrefix}资产复用汽车销售短视频`
  return `${languagePrefix}汽车销售短视频`
}

function sourceLabel(source: CarSalesPlanSource) {
  if (source === 'benchmark') return '爆款对标创作'
  if (source === 'asset-reuse') return '资产复用创作'
  return 'AI智能创作'
}

function subtitleModeLabel(mode: CarSalesPlanDraft['subtitleMode']) {
  if (mode === 'off') return '关闭'
  if (mode === 'upload') return '自定义'
  return '自动'
}

function audioPolicyLabel(policy: CarSalesPlanDraft['audioPolicy']) {
  if (policy === 'none') return '关闭'
  if (policy === 'bgm') return '仅BGM'
  if (policy === 'voiceover') return '口播优先'
  return '智能匹配'
}

function roleLabel(role: QuickRenderAssetRole) {
  const labels: Partial<Record<QuickRenderAssetRole, string>> = {
    voice_script: '文案',
    storyboard_json: '分镜',
    benchmark_json: '爆款对标',
    host_image: '数字人',
    host_video: '数字人口播',
    bgm: '背景音乐',
    voiceover: '口播音频',
    material_video: '视频素材',
    reference_video: '参考视频',
    car_model_bundle: '车型素材包',
    material: '普通素材',
  }
  return labels[role] || role
}

function errorMessageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error || '未知错误')
}
