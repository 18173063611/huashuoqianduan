import { getBillingEstimate } from '../../services/creditApi'
import { uploadMaterialAsset } from '../../services/assetApi'
import { generateStoryboard, rewriteScript } from '../../services/scriptApi'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { BillingEstimateResponse } from '../../types/creditTypes'
import type { StoryboardShotItem } from '../../types/scriptTypes'
import type { CarSalesAssetRoleBinding, QuickRenderAssetRole, QuickRenderRequest } from '../../types/videoTypes'
import {
  buildCarModelBundleAssetRoleBindings,
  carModelBundleCoverUrl,
} from './carModelBundle'

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
  creationMode?: string
  chainType?: string
  videoType?: 'standard' | 'digital_human' | 'product_showcase' | 'silent_bgm' | string
  hasDigitalHuman?: boolean
  digitalHumanId?: string
  voiceId?: string
  tone?: string
  language?: string
  duration?: number
  enableSubtitle?: boolean
  subtitleStyle?: string
  enableBigText?: boolean
  bigTextStyle?: string
  enableBgm?: boolean
  bgmStyle?: string
  generateCover?: boolean
  generateTitle?: boolean
  generateDescription?: boolean
  generateTags?: boolean
  benchmarkVideoId?: string
  uploadedVideoId?: string
  reuseAssetIds?: number[]
  vehicleId?: string
  vehicleName?: string
  configItems?: string[]
  warnings?: string[]
}

export function sanitizePlanScript(script: string, userPrompt?: string) {
  const original = (script || '').trim()
  if (!original) return ''
  let text = original
  const promptKey = normalizeScriptCompareText(userPrompt || '')
  for (let index = 0; index < 6; index += 1) {
    const next = stripLeadingUserInstructionSentence(text, promptKey)
    if (next === text) break
    text = next
  }
  return text.trim() || original
}

function stripLeadingUserInstructionSentence(script: string, promptKey: string) {
  const text = script.trimStart()
  const match = text.match(/^([\s\S]*?(?:[\u3002.!?！？]\s*|\r?\n|$))/u)
  const firstSentence = match?.[1]?.trim() || ''
  if (!firstSentence) return text
  const firstKey = normalizeScriptCompareText(firstSentence)
  const compareLength = Math.min(36, Math.max(12, Math.min(promptKey.length, firstKey.length)))
  const promptLooksCopied = Boolean(promptKey && firstKey && (
    firstKey.includes(promptKey.slice(0, compareLength)) ||
    promptKey.includes(firstKey.slice(0, compareLength))
  ))
  if (!promptLooksCopied && !isRequestInstructionSentence(firstSentence) && !isPlanContextLabelSentence(firstSentence)) return text
  return text.slice(match?.[1]?.length || 0).trimStart()
}

function isRequestInstructionSentence(sentence: string) {
  return /^(?:[\s"'()[\]{}:：,，.\u3002!?！？-]+)*(?:(?:\u8bf7)?\u5e2e\u6211|\u7ed9\u6211|\u9ebb\u70e6|\u6839\u636e|\u57fa\u4e8e|\u4f7f\u7528|\u56f4\u7ed5|\u6309|\u6309\u7167).{0,120}(?:\u89c6\u9891|\u77ed\u89c6\u9891|\u6587\u6848|\u811a\u672c|\u5206\u955c|\u65b9\u6848|\u5e7f\u544a|\u53e3\u64ad|\u9500\u552e)/u.test(sentence.trim())
}

function isPlanContextLabelSentence(sentence: string) {
  const text = sentence.trim()
  return /^(?:[\s"'()[\]{}-]+)*(?:\u7528\u6237\u9700\u6c42|\u8f66\u578b\u7d20\u6750\u5305|\u8f66\u578b|\u7d20\u6750\u6458\u8981|\u53c2\u8003\u7206\u6b3e\u7ed3\u6784|\u53c2\u8003\u7ed3\u6784|\u9875\u9762\u4e0a\u4e0b\u6587|\u5df2\u9009\u7d20\u6750|\u751f\u6210\u53c2\u6570|\u7248\u672c|\u5907\u6ce8)\s*[：:]/u.test(text) ||
    /^(?:\u7531\u8f66\u7cfb\u7d20\u6750\u91c7\u96c6|\u56fd\u5185[\/\u4e0e]\u6d77\u5916|\u5df2\u6e05\u7406|\u5df2\u8865\u5145|\u5df2\u4ece\u61c2\u8f66\u5e1d|\u989c\u8272\u4e0d\u4e00\u81f4|Public car model bundle|Replaced with)/u.test(text)
}

function normalizeScriptCompareText(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/[\s"'“”‘’()[\]{}:：,，.\u3002!?！？;；、-]+/gu, '')
    .trim()
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
  let script = sanitizePlanScript(draft.script?.trim() || '', draft.prompt)
  let scriptVersionId: number | null = null

  if (shouldUseLocalPlanOnly) {
    scriptFallback = true
    storyboardFallback = true
    warnings.push('当前积分余额不足，已跳过 AI 文案与分镜接口，使用本地方案预览。')
    script = scriptMatchesTargetLanguage(script, draft.nativeVoiceLanguage) ? script : sanitizePlanScript(buildFallbackPlanScript(draft), draft.prompt)
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
      script = sanitizePlanScript(script, draft.prompt)
      scriptVersionId = rewritten.scriptVersionId || null
      scriptFallback = !rewrittenText || script === fallbackScript
    } catch (error) {
      scriptFallback = true
      script = sanitizePlanScript(buildFallbackPlanScript(draft), draft.prompt)
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
  const assetRoleBindings = buildPlanAssetRoleBindings(draft)
  const vehicleImageUrls = planBindingImageUrls(assetRoleBindings, false)
  const sceneImageUrls = planBindingImageUrls(assetRoleBindings, true)
  const coverAsset = draftCoverAsset(draft)
  const coverUrl = draft.coverUrl || assetCoverUrl(coverAsset) || vehicleImageUrls[0] || sceneImageUrls[0]
  return {
    intent: 'car_sales',
    assetIds: draft.assets.map((item) => item.assetId),
    assetRoles: Object.fromEntries(draft.assets.map((item) => [String(item.assetId), item.role])),
    assetTextContents: Object.fromEntries(
      draft.assets
        .filter((item) => item.textContent && item.textContent.trim())
        .map((item) => [String(item.assetId), item.textContent || '']),
    ),
    imageUrls: vehicleImageUrls.length ? vehicleImageUrls : undefined,
    sceneImageUrls: sceneImageUrls.length ? sceneImageUrls : undefined,
    assetRoleBindings: assetRoleBindings.length ? assetRoleBindings : undefined,
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
    generatedStoryboard: plan.storyboard.map((shot) => ({
      index: shot.index,
      visual: shot.visual,
      narration: shot.narration,
      duration: shot.duration,
    })),
    goalText: buildGoalTextForRequest(draft, plan),
    outputPurpose: 'car_sales_video',
    hostAppearanceEnabled: Boolean(draft.hostAppearanceEnabled),
    subtitleOverlay: draft.subtitleOverlay,
    headlineOverlay: draft.headlineOverlay,
    ...buildPlanDraftAdvancedRequestFields(draft),
  }
}

function buildPlanDraftAdvancedRequestFields(draft: CarSalesPlanDraft): Partial<QuickRenderRequest> {
  const hostAsset = draft.assets.find((asset) => asset.role === 'host_image' || asset.role === 'host_video')
  const voiceAsset = draft.assets.find((asset) => asset.role === 'voiceover' || asset.role === 'reference_audio')
  const vehicleAsset = draft.assets.find((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_'))
  const hasHeadline = Boolean(draft.headlineOverlay?.enabled && draft.headlineOverlay.text?.trim())
  const duration = draft.duration || draft.segmentCount * draft.segmentDuration
  const videoType = draft.videoType || (draft.hostAppearanceEnabled ? 'digital_human' : draft.audioPolicy === 'bgm' ? 'silent_bgm' : 'standard')
  const bgmStyle = draft.bgmStyle || 'auto'
  return {
    creationMode: draft.creationMode || sourceLabel(draft.source),
    chainType: draft.chainType || draft.source,
    videoType,
    hasDigitalHuman: draft.hasDigitalHuman ?? Boolean(draft.hostAppearanceEnabled),
    digitalHumanId: draft.digitalHumanId || (hostAsset ? String(hostAsset.assetId) : undefined),
    voiceId: draft.voiceId || (voiceAsset ? String(voiceAsset.assetId) : undefined),
    tone: draft.tone || 'professional',
    language: draft.language || draft.nativeVoiceLanguage || 'zh-CN',
    duration,
    enableSubtitle: draft.enableSubtitle ?? draft.subtitleMode !== 'off',
    subtitleStyle: draft.subtitleStyle || overlayStyleLabel(draft.subtitleOverlay),
    enableBigText: draft.enableBigText ?? hasHeadline,
    bigTextStyle: draft.bigTextStyle || (hasHeadline ? overlayStyleLabel(draft.headlineOverlay) : undefined),
    enableBgm: draft.enableBgm ?? (bgmStyle !== 'none' && (
      draft.audioPolicy === 'bgm' ||
      draft.audioPolicy === 'auto' ||
      draft.assets.some((asset) => asset.role === 'bgm')
    )),
    bgmStyle,
    generateCover: draft.generateCover ?? true,
    generateTitle: draft.generateTitle ?? true,
    generateDescription: draft.generateDescription ?? true,
    generateTags: draft.generateTags ?? true,
    benchmarkVideoId: draft.benchmarkVideoId,
    uploadedVideoId: draft.uploadedVideoId,
    reuseAssetIds: draft.reuseAssetIds || (draft.source === 'asset-reuse' ? draft.assets.map((asset) => asset.assetId) : undefined),
    vehicleId: draft.vehicleId || (vehicleAsset ? String(vehicleAsset.assetId) : undefined),
    vehicleName: draft.vehicleName || vehicleAsset?.fileName,
  }
}

function overlayStyleLabel(overlay: QuickRenderRequest['headlineOverlay'] | QuickRenderRequest['subtitleOverlay']) {
  if (!overlay) return undefined
  const parts = [
    overlay.position || '',
    overlay.fontSize ? `${overlay.fontSize}px` : '',
  ].filter(Boolean)
  return parts.length ? parts.join('/') : undefined
}

function buildPlanAssetRoleBindings(draft: CarSalesPlanDraft): CarSalesAssetRoleBinding[] {
  return dedupePlanAssetRoleBindings(draft.assets.flatMap((asset) => {
    if (asset.role === 'car_model_bundle') {
      return buildCarModelBundleAssetRoleBindings(asset, asset.textContent)
    }
    const binding = planAssetRoleBinding(asset)
    return binding ? [binding] : []
  }))
}

function planAssetRoleBinding(asset: CarSalesPlanDraftAsset): CarSalesAssetRoleBinding | null {
  const url = asset.fileUrl || asset.thumbnailUrl || ''
  if (!url && !asset.assetId) {
    return null
  }
  return {
    assetId: asset.assetId,
    url: url || undefined,
    assetType: String(asset.assetType || ''),
    assetRole: asset.role,
    label: roleLabel(asset.role) || asset.fileName,
  }
}

function dedupePlanAssetRoleBindings(bindings: CarSalesAssetRoleBinding[]) {
  const seen = new Set<string>()
  return bindings.filter((binding) => {
    const key = [
      binding.assetId || '',
      binding.url || '',
      binding.assetRole || '',
    ].join('|')
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function planBindingImageUrls(bindings: CarSalesAssetRoleBinding[], sceneOnly: boolean) {
  const urls = bindings
    .filter((binding) => {
      const role = String(binding.assetRole || '').toLowerCase()
      const isScene = role.startsWith('scene_')
      return sceneOnly ? isScene : !isScene
    })
    .map((binding) => binding.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
  return Array.from(new Set(urls))
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
  if (asset.role === 'car_model_bundle') {
    const cover = carModelBundleCoverUrl(asset, asset.textContent)
    if (cover) return cover
  }
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
    `高级参数：${advancedPlanLabelText(draft)}`,
    draft.nativeVoiceLanguage === 'en-US'
      ? 'Voice language: English voiceover only. Return natural English narration and avoid Chinese copy.'
      : '',
  ].filter(Boolean).join('\n')
}

function buildGoalTextForRequest(draft: CarSalesPlanDraft, plan: AiPlanPreview) {
  return [
    draft.title || sourceLabel(draft.source),
    plan.storyboard.length ? `confirmed storyboard: ${plan.storyboard.map((shot) => shot.visual.trim()).filter(Boolean).join('; ')}` : '',
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
    narration: sanitizePlanScript(lines[index] || lines[lines.length - 1] || draft.title || '汽车销售短视频', draft.prompt),
    duration: draft.segmentDuration,
  }))
}

function normalizeStoryboardShots(shots: StoryboardShotItem[] | undefined, draft: CarSalesPlanDraft) {
  return (shots || []).slice(0, draft.segmentCount).map((shot, index) => ({
    index: shot.index || index + 1,
    visual: shot.visual || '车辆销售画面',
    narration: sanitizePlanScript(shot.narration || draft.title || '汽车销售口播', draft.prompt),
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
    `类型 ${videoTypeLabel(draft.videoType || (draft.hostAppearanceEnabled ? 'digital_human' : 'standard'))}`,
    `语气 ${toneLabel(draft.tone || 'professional')}`,
    `BGM ${bgmStyleLabel(draft.bgmStyle || 'auto')}`,
  ]
  if (draft.source === 'benchmark') items.push('爆款结构复用')
  if (draft.source === 'asset-reuse') items.push('资产复用')
  if (draft.hostAppearanceEnabled) items.push('数字人出镜')
  if (draft.headlineOverlay?.enabled) items.push('大字报')
  if (draft.model !== 'auto') items.push(`模型 ${draft.model}`)
  const publishItems = [
    draft.generateCover ?? true ? '封面' : '',
    draft.generateTitle ?? true ? '标题' : '',
    draft.generateDescription ?? true ? '简介' : '',
    draft.generateTags ?? true ? '标签' : '',
  ].filter(Boolean)
  if (publishItems.length) items.push(`发布物料 ${publishItems.join('/')}`)
  return [...items, ...(draft.configItems || [])]
}

function rewriteStyleBySource(source: CarSalesPlanSource, language?: string) {
  const languagePrefix = language === 'en-US' ? 'English voiceover, English subtitles, ' : ''
  if (source === 'benchmark') return `${languagePrefix}爆款汽车销售短视频`
  if (source === 'asset-reuse') return `${languagePrefix}资产复用汽车销售短视频`
  return `${languagePrefix}汽车销售短视频`
}

function advancedPlanLabelText(draft: CarSalesPlanDraft) {
  const publishItems = [
    draft.generateCover ?? true ? '封面' : '',
    draft.generateTitle ?? true ? '标题' : '',
    draft.generateDescription ?? true ? '简介' : '',
    draft.generateTags ?? true ? '标签' : '',
  ].filter(Boolean)
  return [
    `视频类型 ${videoTypeLabel(draft.videoType || (draft.hostAppearanceEnabled ? 'digital_human' : 'standard'))}`,
    `语气 ${toneLabel(draft.tone || 'professional')}`,
    `BGM ${bgmStyleLabel(draft.bgmStyle || 'auto')}`,
    draft.hostAppearanceEnabled ? '数字人出镜' : '无数字人出镜',
    draft.headlineOverlay?.enabled && draft.headlineOverlay.text ? `大字报 ${draft.headlineOverlay.text}` : '',
    publishItems.length ? `发布物料 ${publishItems.join('、')}` : '',
  ].filter(Boolean).join('；')
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

function videoTypeLabel(type: string) {
  const labels: Record<string, string> = {
    standard: '常规销售视频',
    digital_human: '数字人口播',
    product_showcase: '车型展示',
    silent_bgm: '无口播 BGM',
  }
  return labels[type] || type || '常规销售视频'
}

function toneLabel(tone: string) {
  const labels: Record<string, string> = {
    professional: '专业讲解',
    promotional: '促销转化',
    premium: '高级克制',
    energetic: '高能种草',
    warm: '温暖陪伴',
    tech: '科技理性',
  }
  return labels[tone] || tone || '专业讲解'
}

function bgmStyleLabel(style: string) {
  const labels: Record<string, string> = {
    auto: '智能匹配',
    none: '不使用 BGM',
    upbeat: '轻快节奏',
    premium: '高级氛围',
    warm: '温暖生活',
    tech: '科技动感',
  }
  return labels[style] || style || '智能匹配'
}

function roleLabel(role: QuickRenderAssetRole) {
  const labels: Partial<Record<QuickRenderAssetRole, string>> = {
    car_exterior_front: '车辆主图',
    car_exterior_side: '车辆侧面',
    car_exterior_rear: '车辆尾部',
    car_exterior_45: '外观45度',
    car_interior_dashboard: '内饰中控',
    car_interior_front_seat: '前排内饰',
    car_interior_back_seat: '后排内饰',
    car_interior_steering: '方向盘/中控',
    car_interior_trunk: '后备箱',
    car_detail_sunroof: '天窗细节',
    car_detail_light: '车灯细节',
    car_detail_wheel: '轮毂细节',
    car_detail_logo: '车标细节',
    car_detail_seat_material: '座椅材质',
    scene_showroom: '展厅场景',
    scene_outdoor: '户外场景',
    scene_road: '道路场景',
    scene_night: '夜景/门店',
    scene_material_bundle: '场景素材包',
    voice_script: '文案',
    storyboard_json: '分镜',
    benchmark_json: '爆款对标',
    host_image: '数字人',
    host_video: '数字人口播',
    bgm: '背景音乐',
    voiceover: '口播音频',
    reference_audio: '参考音频',
    subtitle: '字幕文件',
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
