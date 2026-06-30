import { getBillingEstimate } from '../../services/creditApi'
import { uploadMaterialAsset } from '../../services/assetApi'
import { generateStoryboard, rewriteScript } from '../../services/scriptApi'
import {
  normalizeCarNativeSpeechStyle,
  normalizeCarNativeVoiceStyle,
} from '../../constants/carSalesVoiceStyles'
import {
  carSalesSpokenLanguageName,
} from '../../constants/carSalesLanguages'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { BillingEstimateResponse } from '../../types/creditTypes'
import type { StoryboardShotItem } from '../../types/scriptTypes'
import type { CarSalesAssetRoleBinding, QuickRenderAssetRole, QuickRenderRequest } from '../../types/videoTypes'
import {
  buildCarModelBundleAssetRoleBindings,
  carModelBundleCoverUrl,
  isLikelyImageReferenceUrl,
} from './carModelBundle'

export type CarSalesPlanSource = 'ai-smart' | 'benchmark' | 'asset-reuse'

const MAX_GENERATION_SEGMENTS = 12
const DEFAULT_MODEL_MAX_SEGMENT_DURATION = 15
const DEFAULT_MODEL_SEGMENT_DURATION = 5
const DEFAULT_CAR_SALES_MODEL = 'auto'
const SEEDANCE_1_5_MODEL = 'doubao-seedance-1-5-pro-251215'
const SEEDANCE_2_MODEL = 'ep-20260512233524-85r4g'
const SEEDANCE_2_PRO_MODEL = 'doubao-seedance-2-0-pro-250528'

const MODEL_MAX_SEGMENT_DURATIONS: Record<string, number> = {
  [SEEDANCE_1_5_MODEL]: 12,
  [SEEDANCE_2_MODEL]: 15,
  [SEEDANCE_2_PRO_MODEL]: 15,
}

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

export const CAR_SALES_SEGMENT_CREDIT_COST = 220

export function estimateCarSalesVideoCreditCost(segmentCount: unknown) {
  const parsed = Math.round(Number(segmentCount) || 1)
  return Math.max(1, Math.min(MAX_GENERATION_SEGMENTS, parsed)) * CAR_SALES_SEGMENT_CREDIT_COST
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
  autoTtsVoiceId?: number | null
  autoTtsSpeed?: number
  autoTtsVolume?: number
  autoTtsPitch?: number
  burnInSubtitle: boolean
  customSubtitle?: string
  audioPolicy: QuickRenderRequest['audioPolicy']
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
  avatarUrl?: string
  hostImageUrl?: string
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

export function isNoVoiceCarSalesAudioPolicy(policy?: string | null) {
  const normalized = (policy || '').trim().toLowerCase()
  return normalized === 'none'
    || normalized === 'bgm'
    || normalized === 'silent_bgm'
    || normalized === 'mute'
    || normalized === 'muted'
    || normalized === 'no_voice'
}

export function isNoVoiceCarSalesVideoType(videoType?: string | null) {
  const normalized = (videoType || '').trim().toLowerCase()
  return normalized === 'silent_bgm' || normalized === 'product_showcase'
}

export function shouldSuppressCarSalesVoice(draft: Pick<CarSalesPlanDraft, 'audioPolicy' | 'videoType'>) {
  return isNoVoiceCarSalesAudioPolicy(draft.audioPolicy)
    || isNoVoiceCarSalesVideoType(draft.videoType)
}

export function shouldUseUploadedCarSalesVoice(
  draft: Pick<CarSalesPlanDraft, 'assets' | 'audioPolicy' | 'videoType'>,
) {
  return !shouldSuppressCarSalesVoice(draft)
    && draft.assets.some((asset) => isUploadedVoiceAsset(asset))
}

function isUploadedVoiceAsset(asset?: Pick<CarSalesPlanDraftAsset, 'role'> | null) {
  return asset?.role === 'voiceover' || asset?.role === 'reference_audio'
}

type DigitalHumanPlanContext = Pick<CarSalesPlanDraft,
  | 'source'
  | 'prompt'
  | 'assets'
  | 'audioPolicy'
  | 'videoType'
  | 'nativeVoiceLanguage'
  | 'hostAppearanceEnabled'
  | 'hasDigitalHuman'
  | 'digitalHumanId'
  | 'avatarUrl'
  | 'hostImageUrl'
> & {
  title?: string
  script?: string
  storyboard?: AiPlanStoryboardShot[]
}

const DIGITAL_HUMAN_CUE_PATTERNS = [
  /数字人/,
  /虚拟人/,
  /主播/,
  /主持人/,
  /销售顾问/,
  /讲解员/,
  /人物出镜/,
  /真人出镜/,
  /出镜讲解/,
  /出镜口播/,
  /顾问出镜/,
  /presenter/i,
  /avatar/i,
  /spokesperson/i,
  /sales consultant/i,
  /digital human/i,
  /talking head/i,
]

const NO_DIGITAL_HUMAN_CUE_PATTERNS = [
  /无数字人/,
  /不要数字人/,
  /不需要数字人/,
  /不用数字人/,
  /不出镜/,
  /人物不出镜/,
  /不出现人物/,
  /无人物/,
  /纯车辆/,
  /仅车辆/,
  /只展示车辆/,
  /no presenter/i,
  /no host/i,
  /no avatar/i,
  /without presenter/i,
  /vehicle only/i,
  /car only/i,
]

export function detectsDigitalHumanCue(text: string) {
  const normalized = (text || '').trim()
  if (!normalized) return false
  const negativeCount = NO_DIGITAL_HUMAN_CUE_PATTERNS.filter((pattern) => pattern.test(normalized)).length
  const positiveCount = DIGITAL_HUMAN_CUE_PATTERNS.filter((pattern) => pattern.test(normalized)).length
  return positiveCount > negativeCount
}

export function carSalesDigitalHumanEnabled(draft: Pick<DigitalHumanPlanContext,
  'hostAppearanceEnabled' | 'hasDigitalHuman' | 'digitalHumanId' | 'avatarUrl' | 'hostImageUrl'
>) {
  return Boolean(
    draft.hostAppearanceEnabled
    || draft.hasDigitalHuman
    || draft.digitalHumanId
    || draft.avatarUrl
    || draft.hostImageUrl,
  )
}

export function carSalesDraftHasDigitalHumanAsset(draft: Pick<DigitalHumanPlanContext,
  'assets' | 'digitalHumanId' | 'avatarUrl' | 'hostImageUrl'
>) {
  return Boolean(
    draft.digitalHumanId
    || draft.avatarUrl
    || draft.hostImageUrl
    || draft.assets.some((asset) => asset.role === 'host_image' || asset.role === 'host_video'),
  )
}

function digitalHumanAnalysisText(
  draft: DigitalHumanPlanContext,
  script = draft.script || '',
  storyboard = draft.storyboard || [],
) {
  return [
    draft.title || '',
    draft.prompt || '',
    script || '',
    ...storyboard.flatMap((shot) => [shot.visual, shot.narration]),
  ].filter(Boolean).join('\n')
}

export function buildDigitalHumanPlanWarnings(
  draft: DigitalHumanPlanContext,
  script = draft.script || '',
  storyboard = draft.storyboard || [],
) {
  const warnings: string[] = []
  const enabled = carSalesDigitalHumanEnabled(draft)
  const hasAsset = carSalesDraftHasDigitalHumanAsset(draft)
  const hasCue = detectsDigitalHumanCue(digitalHumanAnalysisText(draft, script, storyboard))
  if (hasCue && !enabled) {
    warnings.push('检测到文案/分镜包含数字人、主播或销售顾问出镜描述，但当前未开启数字人出镜；系统会优先按车辆主画面生成，如需保留人物讲解请开启数字人并选择形象。')
  }
  if (enabled && !hasAsset) {
    warnings.push('已开启数字人出镜，但还没有选择数字人形象；系统会保留出镜节奏，建议先选择数字人素材以保证人物一致性。')
  }
  if (enabled && !hasCue) {
    warnings.push(shouldSuppressCarSalesVoice(draft)
      ? '已根据数字人参数补充分镜无声出镜描述；请确认是否需要销售顾问出镜引导，不需要时可关闭数字人。'
      : '已根据数字人参数补充分镜出镜描述；请确认是否需要销售顾问出镜讲解，不需要时可关闭数字人。')
  }
  return warnings
}

function digitalHumanStoryboardCue(draft: DigitalHumanPlanContext) {
  return shouldSuppressCarSalesVoice(draft)
    ? '数字人销售顾问保持同一形象，在画面侧边安全区出镜做无声引导，不遮挡车辆主体。'
    : '数字人销售顾问保持同一形象，在画面侧边安全区出镜讲解，不遮挡车辆主体。'
}

export function digitalHumanSourceInstruction(draft: DigitalHumanPlanContext) {
  if (!carSalesDigitalHumanEnabled(draft)) return ''
  if (draft.nativeVoiceLanguage === 'en-US') {
    return shouldSuppressCarSalesVoice(draft)
      ? 'Digital human requirement: keep one consistent sales consultant avatar in the storyboard safe zone as a silent guide; do not add voiceover lines.'
      : 'Digital human requirement: write the script as a sales consultant presentation, and describe the same avatar appearing in the storyboard safe zone without covering the vehicle.'
  }
  return shouldSuppressCarSalesVoice(draft)
    ? '数字人要求：保持同一数字人销售顾问在分镜安全区出镜做无声引导，不生成口播台词。'
    : '数字人要求：文案以汽车销售顾问口吻讲解；分镜写明同一数字人销售顾问在安全区出镜，不遮挡车辆主体。'
}

export function enrichStoryboardWithDigitalHumanContext<T extends AiPlanStoryboardShot>(
  storyboard: T[],
  draft: DigitalHumanPlanContext,
) {
  if (!carSalesDigitalHumanEnabled(draft) || !storyboard.length) return storyboard
  const cue = digitalHumanStoryboardCue(draft)
  return storyboard.map((shot) => ({
    ...shot,
    visual: detectsDigitalHumanCue(shot.visual) ? shot.visual : `${shot.visual}；${cue}`,
  }))
}

export function enrichScriptWithDigitalHumanContext(script: string, draft: DigitalHumanPlanContext) {
  const clean = sanitizePlanScript(script || '', draft.prompt)
  if (!clean || shouldSuppressCarSalesVoice(draft) || !carSalesDigitalHumanEnabled(draft) || detectsDigitalHumanCue(clean)) {
    return clean
  }
  const prefix = draft.nativeVoiceLanguage === 'en-US'
    ? "Hi, I'm your sales consultant. Let me walk you through this vehicle."
    : '大家好，我是您的汽车销售顾问，今天带您快速了解这款车。'
  return sanitizePlanScript(`${prefix}\n${clean}`, draft.prompt)
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

function clearStoryboardNarration(storyboard: AiPlanStoryboardShot[]) {
  return storyboard.map((shot) => ({ ...shot, narration: '' }))
}

export async function prepareCarSalesAiPlanPreview(draft: CarSalesPlanDraft): Promise<AiPlanPreview> {
  const warnings = [...(draft.warnings || [])]
  const estimate = await fetchPlanBillingEstimate(draft, warnings)
  const shouldUseLocalPlanOnly = estimate?.enoughBalance === false
  const useUploadedVoice = shouldUseUploadedCarSalesVoice(draft)

  let scriptFallback = false
  let storyboardFallback = false
  let script = useUploadedVoice ? '' : sanitizePlanScript(draft.script?.trim() || '', draft.prompt)
  let scriptVersionId: number | null = null

  if (useUploadedVoice) {
    const warning = '已检测到上传口播音频，跳过文案生成，成片口播以该音频为准。'
    if (!warnings.includes(warning)) warnings.push(warning)
  } else if (shouldUseLocalPlanOnly) {
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

  if (!useUploadedVoice) {
    const punctuationRewrite = await rewriteUnpunctuatedPlanScript(script, draft, warnings)
    script = punctuationRewrite.script
    scriptVersionId = punctuationRewrite.scriptVersionId || scriptVersionId
  }
  const scriptBeforeDigitalHumanEnrichment = script
  if (!useUploadedVoice) {
    script = enrichScriptWithDigitalHumanContext(script, draft)
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
  storyboard = useUploadedVoice
    ? clearStoryboardNarration(storyboard)
    : bindStoryboardNarrationToScript(storyboard, script, draft)
  const storyboardBeforeDigitalHumanEnrichment = storyboard
  buildDigitalHumanPlanWarnings(draft, scriptBeforeDigitalHumanEnrichment, storyboardBeforeDigitalHumanEnrichment)
    .forEach((warning) => {
      if (!warnings.includes(warning)) warnings.push(warning)
    })
  storyboard = enrichStoryboardWithDigitalHumanContext(storyboard, draft)
  if (useUploadedVoice) {
    storyboard = clearStoryboardNarration(storyboard)
  }
  storyboard = normalizeStoryboardForModelLimits(storyboard, draft, warnings)
  const effectiveSegmentCount = storyboard.length || draft.segmentCount
  const effectiveTotalDuration = storyboardDurationTotal(storyboard)
    || draft.duration
    || draft.segmentCount * draft.segmentDuration

  return {
    script,
    scriptFallback,
    storyboard,
    storyboardFallback,
    estimatedCredits: Math.max(
      estimate?.estimatedCreditCost ?? 0,
      estimateCarSalesVideoCreditCost(effectiveSegmentCount),
    ),
    balance: estimate?.balance ?? null,
    enoughBalance: estimate?.enoughBalance ?? null,
    estimatedDuration: estimatedRenderDurationLabel(draft),
    totalDuration: effectiveTotalDuration,
    segmentCount: effectiveSegmentCount,
    materialCount: draft.assets.length,
    vehicleMaterialCount: vehicleMaterialCount(draft),
    configItems: buildPlanConfigItems(draft),
    warnings,
  }
}

export async function ensureCarSalesPlanDraftAsset(draft: CarSalesPlanDraft, plan: AiPlanPreview): Promise<CarSalesPlanDraft> {
  const createdAt = new Date().toISOString()
  const createdAssets: CarSalesPlanDraftAsset[] = []
  const sourcePrefix = draft.source === 'benchmark'
    ? 'benchmark'
    : draft.source === 'asset-reuse'
      ? 'asset-reuse'
      : 'ai-smart'
  const baseMetadata = {
    from: 'car_sales_plan_draft',
    source: draft.source,
    chainType: draft.source,
    sourceUrl: draft.referenceUrl || undefined,
    coverUrl: draft.coverUrl || undefined,
    title: draft.title || undefined,
    createdBy: 'unified_car_sales_plan',
    createdAt,
  }
  const script = plan.script.trim()
  if (script) {
    const scriptAsset = await uploadMaterialAsset(
      new File([script], `${sourcePrefix}-voice-script-${Date.now()}.txt`, { type: 'text/plain' }),
      {
        metadataJson: JSON.stringify({
          ...baseMetadata,
          assetRole: 'voice_script',
          assetGroup: '口播文案',
          contentKind: 'voice_script',
        }),
      },
    )
    createdAssets.push(planAssetFromAssetItem(scriptAsset, 'voice_script', script))
  }

  const storyboardContent = JSON.stringify({
    source: draft.source,
    title: draft.title,
    referenceUrl: draft.referenceUrl,
    coverUrl: draft.coverUrl,
    script,
    storyboard: plan.storyboard,
    configItems: plan.configItems,
    createdAt,
  }, null, 2)
  if (plan.storyboard.length) {
    const storyboardAsset = await uploadMaterialAsset(
      new File([storyboardContent], `${sourcePrefix}-storyboard-${Date.now()}.json`, { type: 'application/json' }),
      {
        metadataJson: JSON.stringify({
          ...baseMetadata,
          assetRole: 'storyboard_json',
          assetGroup: '分镜脚本',
          contentKind: 'storyboard',
          shotCount: plan.storyboard.length,
        }),
      },
    )
    createdAssets.push(planAssetFromAssetItem(storyboardAsset, 'storyboard_json', storyboardContent))
  }

  if (draft.source === 'benchmark') {
    const benchmarkAsset = await uploadMaterialAsset(
      new File([storyboardContent], `${sourcePrefix}-benchmark-plan-${Date.now()}.json`, { type: 'application/json' }),
      {
        metadataJson: JSON.stringify({
          ...baseMetadata,
          assetRole: 'benchmark_json',
          assetGroup: '爆款对标',
          contentKind: 'benchmark_plan',
          shotCount: plan.storyboard.length,
        }),
      },
    )
    createdAssets.push(planAssetFromAssetItem(benchmarkAsset, 'benchmark_json', storyboardContent))
  }

  if (!createdAssets.length) {
    return draft
  }
  return {
    ...draft,
    assets: [
      ...createdAssets,
      ...draft.assets,
    ],
  }
}

export function buildQuickRenderRequestFromPlanDraft(
  draft: CarSalesPlanDraft,
  plan: AiPlanPreview,
): QuickRenderRequest {
  const useUploadedVoice = shouldUseUploadedCarSalesVoice(draft)
  const script = useUploadedVoice ? '' : plan.script.trim()
  const model = normalizePlanModel(draft.model)
  const effectiveDraft = { ...draft, model }
  const normalizedPlanStoryboard = normalizeStoryboardForModelLimits(plan.storyboard, effectiveDraft)
  const storyboard = useUploadedVoice
    ? clearStoryboardNarration(normalizedPlanStoryboard)
    : syncStoryboardNarrationWithScript(normalizedPlanStoryboard, script, draft.prompt)
  const segmentCount = storyboard.length || draft.segmentCount
  const totalDuration = storyboardDurationTotal(storyboard)
    || draft.duration
    || draft.segmentCount * draft.segmentDuration
  const segmentDuration = normalizePlanSegmentDuration(
    Math.round(totalDuration / Math.max(1, segmentCount)) || draft.segmentDuration,
    model,
  )
  const narrationText = useUploadedVoice
    ? ''
    : storyboard
      .map((shot) => sanitizePlanScript(shot.narration || '', draft.prompt))
      .filter(Boolean)
      .join('\n')
  const assetRoleBindings = buildPlanAssetRoleBindings(draft)
  const vehicleImageUrls = planBindingImageUrls(assetRoleBindings, false)
  const sceneImageUrls = planBindingImageUrls(assetRoleBindings, true)
  const coverAsset = draftCoverAsset(draft)
  const coverUrl = draft.coverUrl || assetCoverUrl(coverAsset) || vehicleImageUrls[0] || sceneImageUrls[0]
  const suppressVoice = shouldSuppressCarSalesVoice(draft)
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
    nativeVoiceStyle: normalizeCarNativeVoiceStyle(draft.nativeVoiceStyle),
    nativeSpeechStyle: normalizeCarNativeSpeechStyle(draft.nativeSpeechStyle),
    autoTtsVoiceId: draft.autoTtsVoiceId || undefined,
    autoTtsSpeed: draft.autoTtsSpeed,
    autoTtsVolume: draft.autoTtsVolume,
    autoTtsPitch: draft.autoTtsPitch,
    burnInSubtitle: draft.subtitleMode !== 'off' && draft.burnInSubtitle,
    customSubtitle: draft.subtitleMode === 'upload' ? draft.customSubtitle || undefined : undefined,
    finalVoiceText: suppressVoice || useUploadedVoice ? undefined : narrationText || script || undefined,
    strictVoiceText: suppressVoice || useUploadedVoice ? false : Boolean(narrationText || script),
    audioPolicy: draft.audioPolicy,
    model,
    segmentCount,
    segmentDuration,
    generatedStoryboard: storyboard.map((shot) => ({
      index: shot.index,
      visual: shot.visual,
      narration: useUploadedVoice ? '' : shot.narration,
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
  const hostImageUrl = draft.hostImageUrl || draft.avatarUrl || hostAsset?.fileUrl || hostAsset?.thumbnailUrl
  return {
    creationMode: draft.creationMode || sourceLabel(draft.source),
    chainType: draft.chainType || draft.source,
    videoType,
    hasDigitalHuman: draft.hasDigitalHuman ?? Boolean(draft.hostAppearanceEnabled),
    digitalHumanId: draft.digitalHumanId || (hostAsset ? String(hostAsset.assetId) : undefined),
    avatarUrl: hostImageUrl || undefined,
    hostImageUrl: hostImageUrl || undefined,
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
      return bindingIsImageReference(binding) && (sceneOnly ? isScene : !isScene)
    })
    .map((binding) => binding.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
  return Array.from(new Set(urls))
}

function bindingIsImageReference(binding: CarSalesAssetRoleBinding) {
  const assetType = String(binding.assetType || '').trim().toLowerCase()
  if (['audio', 'bgm', 'json', 'script_asset', 'storyboard_asset', 'text', 'video'].includes(assetType)) {
    return false
  }
  if (assetType && assetType !== 'image' && assetType !== 'cover') {
    return false
  }
  return isLikelyImageReferenceUrl(binding.url)
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
  const totalDuration = draft.duration || draft.segmentCount * draft.segmentDuration
  return [
    sourceLabel(draft.source),
    draft.title ? `标题：${draft.title}` : '',
    draft.prompt ? `用户需求：${draft.prompt}` : '',
    draft.referenceUrl ? `参考链接：${draft.referenceUrl}` : '',
    draft.assets.length ? `已选素材：${draft.assets.map((item) => `${item.fileName}(${roleLabel(item.role)})`).join('；')}` : '',
    `生成参数：${totalDuration} 秒，${draft.segmentCount} 段，比例 ${draft.aspectRatio}`,
    `高级参数：${advancedPlanLabelText(draft)}`,
    digitalHumanSourceInstruction(draft),
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
    digitalHumanSourceInstruction(draft),
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
  if (language && language !== 'zh-CN') {
    return !/[\u4E00-\u9FFF]/.test(text)
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

export function syncStoryboardNarrationWithScript(
  storyboard: AiPlanStoryboardShot[],
  script: string,
  userPrompt?: string,
) {
  if (!storyboard.length) return storyboard
  const scriptUnits = splitPlanScriptUnits(script, storyboard.length)
  if (!scriptUnits.length) {
    return storyboard
  }
  return storyboard.map((shot, index) => ({
    ...shot,
    narration: sanitizePlanScript(scriptUnits[index] || shot.narration || '', userPrompt),
  }))
}

function bindStoryboardNarrationToScript(
  storyboard: AiPlanStoryboardShot[],
  script: string,
  draft: CarSalesPlanDraft,
) {
  if (!storyboard.length) return storyboard
  return storyboard.map((shot, index) => ({
    ...shot,
    narration: sanitizePlanScript(
      shot.narration || splitPlanScriptUnits(script, storyboard.length)[index] || draft.title || '',
      draft.prompt,
    ),
  }))
}

function splitPlanScriptUnits(script: string, targetCount: number) {
  const clean = sanitizePlanScript(script || '')
  if (!clean) return []
  const lines = clean
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length >= targetCount) {
    return fitPlanScriptUnitsToCount(lines, targetCount)
  }
  const clauses = clean
    .split(/(?<=[。！？!?\.])\s*/u)
    .map((line) => line.trim())
    .filter(Boolean)
  if (clauses.length >= targetCount) {
    return fitPlanScriptUnitsToCount(clauses, targetCount)
  }
  return lines.length ? lines : clauses
}

async function rewriteUnpunctuatedPlanScript(
  script: string,
  draft: CarSalesPlanDraft,
  warnings: string[],
): Promise<{ script: string; scriptVersionId: number | null }> {
  const clean = sanitizePlanScript(script, draft.prompt)
  if (!needsPunctuationRewrite(clean)) {
    return { script: clean, scriptVersionId: null }
  }
  try {
    const rewritten = await rewriteScript({
      sourceText: clean,
      style: punctuationRewriteStyle(draft),
      targetLength: Math.min(1200, Math.max(clean.length + 80, draft.segmentCount * 120)),
    })
    const next = sanitizePlanScript(rewritten.rewrittenText || '', draft.prompt)
    if (isPunctuationRewriteUsable(clean, next)) {
      warnings.push('检测到口播文案缺少自然标点，已调用文案改写能力补充分句和停顿，避免分镜口播被硬切。')
      return { script: next, scriptVersionId: rewritten.scriptVersionId || null }
    }
  } catch (error) {
    warnings.push(`口播文案缺少标点，但自动优化失败：${errorMessageFrom(error)}。请在预览中手动补充标点后再生成。`)
  }
  return { script: clean, scriptVersionId: null }
}

function punctuationRewriteStyle(draft: CarSalesPlanDraft) {
  const language = carSalesSpokenLanguageName(draft.nativeVoiceLanguage)
  return [
    'punctuation-only',
    language,
    'Only add punctuation, short line breaks, and natural speech pauses.',
    'Do not rewrite meaning, selling points, vehicle facts, or sentence order.',
  ].join('; ')
}

function needsPunctuationRewrite(script: string) {
  const normalized = script.trim().replace(/\s+/g, ' ')
  const compact = normalized.replace(/\s+/g, '')
  if (compact.length < 36) return false
  const punctuationMatches = compact.match(/[，。！？；：,.!?;:]/gu) || []
  if (punctuationMatches.length >= Math.max(2, Math.floor(compact.length / 80))) return false
  return /[\u4E00-\u9FFF]/u.test(compact) || normalized.split(/\s+/).length >= 14
}

function isPunctuationRewriteUsable(original: string, rewritten: string) {
  const text = rewritten.trim()
  if (!text) return false
  const originalKey = original.replace(/\s+/g, '')
  const rewrittenKey = text.replace(/\s+/g, '').replace(/[，。！？；：,.!?;:]/gu, '')
  if (rewrittenKey.length < originalKey.length * 0.72) return false
  const punctuationMatches = text.match(/[，。！？；：,.!?;:]/gu) || []
  return punctuationMatches.length > 0 && text.length <= original.length * 1.45 + 80
}

export function maxStoryboardSegmentDurationForModel(model?: string) {
  const key = (model || '').trim()
  if (!key || key === 'auto') return DEFAULT_MODEL_MAX_SEGMENT_DURATION
  if (MODEL_MAX_SEGMENT_DURATIONS[key]) return MODEL_MAX_SEGMENT_DURATIONS[key]
  return /seedance[-_]?2|2-0|85r4g/i.test(key) ? 15 : 12
}

export function normalizePlanTargetDuration(value: unknown, fallback = 30, min = 4, max = 120) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(min, Math.min(max, parsed))
}

export function inferPlanSegmentCountForTargetDuration(
  targetDuration: number,
  options: {
    scriptText?: string
    model?: string
    maxSegments?: number
    minSegmentDuration?: number
  } = {},
) {
  const minDuration = Math.max(1, options.minSegmentDuration || 4)
  const maxSegments = Math.max(1, options.maxSegments || MAX_GENERATION_SEGMENTS)
  const normalizedTarget = normalizePlanTargetDuration(targetDuration)
  const maxByMin = Math.max(1, Math.floor(normalizedTarget / minDuration))
  const minByModelMax = Math.max(1, Math.ceil(normalizedTarget / maxStoryboardSegmentDurationForModel(options.model)))
  const script = options.scriptText || ''
  const scriptLines = script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length
  const scriptClauses = script
    .split(/(?<=[。！？!?\.；;])\s*/u)
    .map((line) => line.trim())
    .filter(Boolean).length
  const textHint = Math.max(scriptLines, scriptClauses)
  const durationHint = normalizedTarget <= 10
    ? 2
    : normalizedTarget <= 15
      ? 3
      : normalizedTarget <= 30
        ? Math.ceil(normalizedTarget / 6)
        : Math.ceil(normalizedTarget / 8)
  return Math.max(minByModelMax, Math.min(maxSegments, maxByMin, textHint || durationHint))
}

export function distributePlanDurationsToTarget(
  totalDuration: number,
  count: number,
  weights: number[] = [],
  options: { minSegmentDuration?: number } = {},
) {
  const minSegmentDuration = Math.max(1, Math.round(Number(options.minSegmentDuration) || 4))
  const total = normalizePlanTargetDuration(totalDuration, 30, minSegmentDuration)
  const maxCountForTotal = Math.max(1, Math.floor(total / minSegmentDuration))
  const safeCount = Math.max(
    1,
    Math.min(MAX_GENERATION_SEGMENTS, Math.round(Number(count) || 1), maxCountForTotal),
  )
  const normalizedWeights = Array.from({ length: safeCount }, (_, idx) => {
    const value = Math.round(Number(weights[idx]) || 0)
    return value > 0 ? value : 1
  })
  let remainingExtra = Math.max(0, total - safeCount * minSegmentDuration)
  let remainingWeight = normalizedWeights.reduce((sum, value) => sum + value, 0) || safeCount
  return normalizedWeights.map((weight, idx) => {
    const isLast = idx === safeCount - 1
    const extra = isLast
      ? remainingExtra
      : Math.max(0, Math.min(remainingExtra, Math.round((weight / remainingWeight) * remainingExtra)))
    remainingExtra -= extra
    remainingWeight -= weight
    return minSegmentDuration + extra
  })
}

export function fitPlanStoryboardToTargetDuration(
  storyboard: AiPlanStoryboardShot[],
  targetDuration: number,
  options: { maxSegments?: number; minSegmentDuration?: number } = {},
) {
  const normalizedTarget = normalizePlanTargetDuration(targetDuration)
  const minSegmentDuration = Math.max(1, Math.round(Number(options.minSegmentDuration) || 4))
  const maxByMinDuration = Math.max(1, Math.floor(normalizedTarget / minSegmentDuration))
  const maxSegments = Math.max(
    1,
    Math.min(MAX_GENERATION_SEGMENTS, options.maxSegments || MAX_GENERATION_SEGMENTS, maxByMinDuration),
  )
  const source = storyboard
    .filter((shot) => shot.visual || shot.narration)
    .slice(0, maxSegments)
  if (!source.length) return []
  const durations = distributePlanDurationsToTarget(
    normalizedTarget,
    source.length,
    source.map((shot) => shot.duration),
    { minSegmentDuration },
  )
  return source.map((shot, idx) => ({
    ...shot,
    index: idx + 1,
    duration: durations[idx] || Math.max(1, Math.round(normalizedTarget / source.length)),
  }))
}

function normalizePlanModel(model?: string) {
  const key = (model || '').trim()
  return !key || key === 'auto' ? DEFAULT_CAR_SALES_MODEL : key
}

function normalizePlanSegmentDuration(value: number, model?: string) {
  const max = maxStoryboardSegmentDurationForModel(model)
  if (!Number.isFinite(value) || value <= 0) return Math.min(DEFAULT_MODEL_SEGMENT_DURATION, max)
  return Math.max(4, Math.min(max, Math.round(value)))
}

function storyboardDurationTotal(storyboard: AiPlanStoryboardShot[]) {
  return storyboard.reduce((sum, shot) => sum + Math.max(1, Math.round(shot.duration || 0)), 0)
}

function normalizeStoryboardForModelLimits(
  storyboard: AiPlanStoryboardShot[],
  draft: CarSalesPlanDraft,
  warnings?: string[],
) {
  if (!storyboard.length) return storyboard
  const maxDuration = maxStoryboardSegmentDurationForModel(draft.model)
  const expanded: AiPlanStoryboardShot[] = []
  let splitCount = 0
  storyboard.forEach((shot) => {
    const duration = Math.max(1, Math.round(shot.duration || draft.segmentDuration || DEFAULT_MODEL_SEGMENT_DURATION))
    if (duration <= maxDuration) {
      expanded.push({ ...shot, duration })
      return
    }
    const parts = splitOversizedStoryboardShot(shot, duration, maxDuration)
    splitCount += parts.length - 1
    expanded.push(...parts)
  })

  const normalized = compactStoryboardForGeneration(expanded, maxDuration, draft)
    .slice(0, MAX_GENERATION_SEGMENTS)
    .map((shot, index) => ({ ...shot, index: index + 1 }))

  if (warnings && splitCount > 0) {
    warnings.push(`检测到 ${splitCount} 个超出单模型时长上限的分镜片段，已按 ${maxDuration} 秒上限拆成连续子镜头并保留原顺序。`)
  }
  if (warnings && compactStoryboardDurationTotal(expanded) > compactStoryboardDurationTotal(normalized)) {
    warnings.push(`分镜片段超过系统一次生成的 ${MAX_GENERATION_SEGMENTS} 段上限，已优先保留前 ${MAX_GENERATION_SEGMENTS} 个连续镜头；如需完整复刻，请缩短参考视频或拆成多条任务。`)
  }
  return normalized
}

function splitOversizedStoryboardShot(
  shot: AiPlanStoryboardShot,
  duration: number,
  maxDuration: number,
) {
  const durations = splitDurationEvenly(duration, maxDuration)
  const narrationUnits = splitPlanScriptUnits(shot.narration || '', durations.length)
  return durations.map((partDuration, index) => ({
    ...shot,
    visual: [
      shot.visual,
      `连续子镜头 ${index + 1}/${durations.length}：保持原镜头主体、景别、运镜和节奏，只承接该长镜头的第 ${index + 1} 段。`,
    ].filter(Boolean).join('\n'),
    narration: sanitizePlanScript(narrationUnits[index] || shot.narration || ''),
    duration: partDuration,
  }))
}

function splitDurationEvenly(duration: number, maxDuration: number) {
  const total = Math.max(1, Math.round(duration))
  const max = Math.max(4, Math.round(maxDuration))
  const count = Math.max(1, Math.ceil(total / max))
  const base = Math.floor(total / count)
  let remainder = total - base * count
  return Array.from({ length: count }).map(() => {
    const value = base + (remainder > 0 ? 1 : 0)
    remainder -= remainder > 0 ? 1 : 0
    return Math.max(1, Math.min(max, value))
  })
}

function compactStoryboardForGeneration(
  storyboard: AiPlanStoryboardShot[],
  maxDuration: number,
  draft: CarSalesPlanDraft,
) {
  if (!storyboard.length) return storyboard
  const groups: AiPlanStoryboardShot[][] = []
  let current: AiPlanStoryboardShot[] = []
  let currentDuration = 0
  storyboard.forEach((shot) => {
    const duration = Math.max(1, Math.round(shot.duration || draft.segmentDuration || DEFAULT_MODEL_SEGMENT_DURATION))
    if (current.length && currentDuration + duration > maxDuration) {
      groups.push(current)
      current = []
      currentDuration = 0
    }
    current.push({ ...shot, duration })
    currentDuration += duration
  })
  if (current.length) groups.push(current)
  return groups.map((group, index) => mergeStoryboardGroup(group, index, maxDuration))
}

function mergeStoryboardGroup(
  group: AiPlanStoryboardShot[],
  index: number,
  maxDuration: number,
): AiPlanStoryboardShot {
  if (group.length === 1) return { ...group[0], index: index + 1 }
  const range = `${group[0].index}-${group[group.length - 1].index}`
  return {
    index: index + 1,
    visual: [
      `连续生成段落，合并原分镜 ${range}，总时长约 ${compactStoryboardDurationTotal(group)} 秒；保持同一车辆、场景、光线和运动方向一致。`,
      ...group.map((shot, childIndex) => `${childIndex + 1}. ${shot.visual}`),
    ].join('\n'),
    narration: group.map((shot) => shot.narration.trim()).filter(Boolean).join('\n'),
    duration: Math.min(maxDuration, compactStoryboardDurationTotal(group)),
  }
}

function compactStoryboardDurationTotal(storyboard: AiPlanStoryboardShot[]) {
  return storyboard.reduce((sum, shot) => sum + Math.max(1, Math.round(shot.duration || 0)), 0)
}

function fitPlanScriptUnitsToCount(units: string[], targetCount: number) {
  const count = Math.max(1, targetCount)
  if (units.length <= count) return units
  const result: string[] = []
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((index * units.length) / count)
    const end = Math.floor(((index + 1) * units.length) / count)
    result.push(units.slice(start, Math.max(start + 1, end)).join(''))
  }
  return result
}

export function parseStoryboardAssetTextToPlanShots(
  raw: string | undefined,
  fallbackDuration = 5,
  maxShots = 24,
): AiPlanStoryboardShot[] {
  const parsed = parseJsonSafely(raw || '')
  const rows = storyboardRowsFromUnknown(parsed)
  return rows
    .slice(0, Math.max(1, maxShots))
    .map((item, index): AiPlanStoryboardShot | null => {
      const row = asPlainRecord(item)
      if (!row) return null
      const visual = firstStringField(row, [
        'visual',
        'visualPrompt',
        'prompt',
        'description',
        'scene',
        'shot',
        'camera',
        'composition',
        'content',
        '画面',
        '镜头',
        '分镜',
      ])
      const narration = firstStringField(row, [
        'narration',
        'voiceText',
        'voice',
        'script',
        'line',
        'text',
        'subtitle',
        'copy',
        '台词',
        '口播',
        '文案',
        '字幕',
      ])
      if (!visual && !narration) return null
      const order = numberField(row, ['index', 'order', 'segmentIndex', 'shotIndex', '序号']) || index + 1
      const duration = numberField(row, [
        'duration',
        'durationSec',
        'durationSeconds',
        'estDurationSec',
        'seconds',
        '时长',
      ]) || fallbackDuration
      return {
        index: Math.max(1, Math.round(order)),
        visual: visual || narration || '车辆销售画面',
        narration: sanitizePlanScript(narration || ''),
        duration: Math.max(1, Math.round(duration)),
      }
    })
    .filter((item): item is AiPlanStoryboardShot => Boolean(item))
}

function parseJsonSafely(raw: string) {
  const text = raw.trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function storyboardRowsFromUnknown(value: unknown, depth = 0): unknown[] {
  if (depth > 5) return []
  if (Array.isArray(value)) return value
  const record = asPlainRecord(value)
  if (!record) return []
  for (const key of [
    'generatedStoryboard',
    'storyboard',
    'scripts',
    'shots',
    'scenes',
    'segments',
    'items',
    'list',
  ]) {
    const rows = storyboardRowsFromUnknown(record[key], depth + 1)
    if (rows.length) return rows
  }
  for (const key of ['result', 'data', 'parseResult', 'storyboardResult', 'output', 'payload']) {
    const rows = storyboardRowsFromUnknown(record[key], depth + 1)
    if (rows.length) return rows
  }
  return []
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function firstStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }
  return ''
}

function numberField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^\d.]/g, ''))
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }
  return 0
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
    const model = normalizePlanModel(draft.model)
    return await getBillingEstimate({
      taskType: 'SEEDANCE_CAR_SALES_VIDEO',
      modelCode: model,
      imageCount: vehicleMaterialCount(draft),
      segmentCount: draft.segmentCount,
      durationSeconds: draft.duration || draft.segmentCount * draft.segmentDuration,
    })
  } catch (error) {
    warnings.push(`积分估算失败，暂按 ${estimateCarSalesVideoCreditCost(draft.segmentCount)} 积分展示：${errorMessageFrom(error)}`)
    return null as BillingEstimateResponse | null
  }
}

function vehicleMaterialCount(draft: CarSalesPlanDraft) {
  return draft.assets.filter((item) => item.role === 'car_model_bundle' || item.role.startsWith('car_') || item.role.startsWith('scene_')).length
}

function estimatedRenderDurationLabel(draft: CarSalesPlanDraft) {
  const totalDuration = draft.duration || draft.segmentCount * draft.segmentDuration
  if (draft.hostAppearanceEnabled) return '3-8 分钟'
  if (draft.segmentCount >= 4 || totalDuration >= 20) return '2-5 分钟'
  return '1-2 分钟'
}

function buildPlanConfigItems(draft: CarSalesPlanDraft) {
  const totalDuration = draft.duration || draft.segmentCount * draft.segmentDuration
  const items = [
    `比例 ${draft.aspectRatio}`,
    `${totalDuration} 秒`,
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
  const languagePrefix = language && language !== 'zh-CN'
    ? `${carSalesSpokenLanguageName(language)} voiceover, ${carSalesSpokenLanguageName(language)} subtitles, `
    : ''
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
  if (policy === 'none' || policy === 'bgm') return '不使用口播'
  if (policy === 'voiceover') return '选择已有口播'
  return '视频生成口播'
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
    none: '关闭背景音乐',
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
