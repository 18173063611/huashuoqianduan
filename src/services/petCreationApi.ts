import { request } from './request'
import { getAuthUser } from './authSession'
import { canAccessPetCreation } from '../config/petCreationAccess'
import type {
  PetAspectRatio,
  PetCreationDraft,
  PetGenerationMode,
  PetCreationStyle,
  PetTaskStatus,
  PetType,
  PetVideoTask,
  PetVideoEstimate,
  PetVideoPreview,
  PetVideoType,
  PetWork,
  PetWorkDownload,
  PetWorkForkOptions,
  PetWorkQuery,
  PetWorkStatus,
} from '../pages/pet-creation/petCreationTypes'
import { getBillingEstimate } from './creditApi'
import { estimatedPetFallbackCost, inferPetGenerationMode, validatePetCreationDraft } from '../pages/pet-creation/petCreationValidation'
import {
  clonePetDraft,
  defaultPetDraft,
  mockDeletePetWork,
  mockDownloadPetWork,
  mockForkPetWork,
  mockGeneratePetScript,
  mockGeneratePetStoryboard,
  mockGetPetDraft,
  mockCreatePetVideoTask,
  mockGetPetVideoTask,
  mockListPetTemplates,
  mockListPetWorks,
  mockRegeneratePetWork,
  mockResetPetDraft,
  mockSavePetDraft,
} from '../pages/pet-creation/petCreationMock'

type PetCreationApiMode = 'mock' | 'auto' | 'real'

const PET_CREATION_API_MODE = normalizeApiMode(import.meta.env.VITE_PET_CREATION_API_MODE)

export function getPetCreationApiMode() {
  return PET_CREATION_API_MODE
}

function normalizeApiMode(value?: string): PetCreationApiMode {
  if (value === 'real' || value === 'auto' || value === 'mock') return value
  return 'auto'
}

function assertPetCreationAccess() {
  if (canAccessPetCreation(getAuthUser())) return
  throw new Error('当前账号暂未开通宠物创作中心。')
}

async function withMockFallback<T>(realRequest: () => Promise<T>, mockRequest: () => Promise<T>) {
  if (PET_CREATION_API_MODE === 'mock') return mockRequest()
  if (PET_CREATION_API_MODE === 'real') return realRequest()

  try {
    return await realRequest()
  } catch (error) {
    console.warn('[petCreationApi] real API failed, fallback to mock.', error)
    emitPetApiFallback(error)
    return mockRequest()
  }
}

function emitPetApiFallback(error: unknown) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(
    new CustomEvent('pet-creation-api-fallback', {
      detail: {
        message: error instanceof Error ? error.message : '真实宠物接口暂不可用，已回退到本地 mock。',
      },
    }),
  )
}

function workQueryString(params: PetWorkQuery) {
  const search = new URLSearchParams()
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.keyword?.trim()) search.set('keyword', params.keyword.trim())
  if (params.petType && params.petType !== 'all') search.set('petType', params.petType)
  const query = search.toString()
  return query ? `?${query}` : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clampProgress(value: unknown) {
  return Math.min(100, Math.max(0, Math.round(numberValue(value, 0))))
}

function normalizeDuration(value: unknown, fallback: 5 | 10 | 15 | 30): 5 | 10 | 15 | 30 {
  const n = Number(value)
  if (n === 5 || n === 10 || n === 15 || n === 30) return n
  return fallback
}

function normalizeAspectRatio(value: unknown, fallback: PetAspectRatio): PetAspectRatio {
  return value === '9:16' || value === '16:9' || value === '1:1' ? value : fallback
}

function normalizePetType(value: unknown, fallback: PetType): PetType {
  return value === 'cat' || value === 'dog' || value === 'other' ? value : fallback
}

function normalizeVideoType(value: unknown, fallback: PetVideoType): PetVideoType {
  if (
    value === 'dialogue' ||
    value === 'short_drama' ||
    value === 'monologue' ||
    value === 'talking' ||
    value === 'image_to_video' ||
    value === 'sticker'
  ) {
    return value
  }
  return fallback
}

function normalizeStyle(value: unknown, fallback: PetCreationStyle): PetCreationStyle {
  if (
    value === 'realistic' ||
    value === 'cute' ||
    value === 'anime' ||
    value === 'anthropomorphic' ||
    value === 'funny' ||
    value === 'healing'
  ) {
    return value
  }
  return fallback
}

function normalizeGenerationMode(value: unknown, fallback: PetGenerationMode): PetGenerationMode {
  if (value === 'reference_video' || value === 'text_video' || value === 'dialogue_video' || value === 'image_to_video') return value
  return fallback
}

export function normalizePetTaskStatus(value: unknown): PetTaskStatus {
  const status = String(value || '').toLowerCase()
  if (['queued', 'pending', 'waiting', 'created'].includes(status)) return 'queued'
  if (['running', 'processing', 'generating', 'in_progress'].includes(status)) return 'running'
  if (['completed', 'complete', 'success', 'succeeded', 'done'].includes(status)) return 'completed'
  if (['failed', 'fail', 'error'].includes(status)) return 'failed'
  if (['canceled', 'cancelled', 'cancel'].includes(status)) return 'canceled'
  return 'running'
}

function normalizePetWorkStatus(value: unknown): PetWorkStatus {
  const status = String(value || '').toLowerCase()
  if (['draft'].includes(status)) return 'draft'
  if (['running', 'queued', 'pending', 'processing', 'generating', 'in_progress'].includes(status)) return 'running'
  if (['completed', 'complete', 'success', 'succeeded', 'done'].includes(status)) return 'completed'
  if (['failed', 'fail', 'error'].includes(status)) return 'failed'
  return 'draft'
}

function normalizePetDraft(raw: unknown, fallback: PetCreationDraft = defaultPetDraft): PetCreationDraft {
  const base = clonePetDraft(fallback)
  if (!isRecord(raw)) return base
  const source = raw as Partial<PetCreationDraft>
  return clonePetDraft({
    ...base,
    ...source,
    prompt: stringValue(source.prompt, base.prompt),
    templateId: stringValue(source.templateId, base.templateId || '') || undefined,
    videoType: normalizeVideoType(source.videoType, base.videoType),
    generationMode: normalizeGenerationMode(source.generationMode, inferPetGenerationMode({ ...base, ...source })),
    roles: Array.isArray(source.roles) ? source.roles : base.roles,
    materials: Array.isArray(source.materials) ? source.materials : base.materials,
    dialogueLines: Array.isArray(source.dialogueLines) ? source.dialogueLines : base.dialogueLines,
    scriptText: stringValue(source.scriptText, base.scriptText || ''),
    shots: Array.isArray(source.shots) ? source.shots : base.shots,
    durationSeconds: normalizeDuration(source.durationSeconds, base.durationSeconds),
    language: 'zh-CN',
    aspectRatio: normalizeAspectRatio(source.aspectRatio, base.aspectRatio),
    style: normalizeStyle(source.style, base.style),
    subtitleEnabled: typeof source.subtitleEnabled === 'boolean' ? source.subtitleEnabled : base.subtitleEnabled,
    voiceEnabled: typeof source.voiceEnabled === 'boolean' ? source.voiceEnabled : base.voiceEnabled,
    lipSyncEnabled: typeof source.lipSyncEnabled === 'boolean' ? source.lipSyncEnabled : base.lipSyncEnabled,
    bgmEnabled: typeof source.bgmEnabled === 'boolean' ? source.bgmEnabled : base.bgmEnabled,
    subtitleStyle: {
      ...base.subtitleStyle,
      ...(isRecord(source.subtitleStyle) ? source.subtitleStyle : {}),
    },
    visualSettings: {
      ...base.visualSettings,
      ...(isRecord(source.visualSettings) ? source.visualSettings : {}),
    },
    consistency: {
      ...base.consistency,
      ...(isRecord(source.consistency) ? source.consistency : {}),
    },
  })
}

function normalizePetVideoTask(raw: unknown, fallbackDraft: PetCreationDraft = defaultPetDraft): PetVideoTask | null {
  if (!isRecord(raw)) return null
  const id = stringValue(raw.id, stringValue(raw.taskId))
  if (!id) return null
  const status = normalizePetTaskStatus(raw.status)
  const progressFallback = status === 'completed' ? 100 : status === 'queued' ? 0 : status === 'failed' || status === 'canceled' ? 100 : 36
  const draft = normalizePetDraft(raw.draft || raw.payload || raw.request || raw.draftJson, fallbackDraft)
  const title = stringValue(raw.title, draft.prompt || draft.scriptText || '萌宠视频生成任务')
  return {
    id,
    title,
    status,
    progress: clampProgress(raw.progress ?? raw.percent ?? progressFallback),
    currentStep: stringValue(raw.currentStep ?? raw.stepName, statusLabel(status)),
    estimatedRemainSeconds: Math.max(0, Math.round(numberValue(raw.estimatedRemainSeconds ?? raw.etaSeconds, 0))),
    draft,
    previewUrl: stringValue(raw.previewUrl ?? raw.videoUrl),
    workId: stringValue(raw.workId ?? raw.resultWorkId),
    errorMessage: stringValue(raw.errorMessage ?? raw.failReason ?? raw.message),
    errorCode: stringValue(raw.errorCode),
    retryable: typeof raw.retryable === 'boolean' ? raw.retryable : undefined,
    createdAt: stringValue(raw.createdAt, new Date().toISOString()),
  }
}

function statusLabel(status: PetTaskStatus) {
  if (status === 'queued') return '等待生成'
  if (status === 'completed') return '生成完成'
  if (status === 'failed') return '生成失败'
  if (status === 'canceled') return '已取消'
  return '生成中'
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!isRecord(raw)) return []
  if (Array.isArray(raw.records)) return raw.records
  if (Array.isArray(raw.list)) return raw.list
  if (Array.isArray(raw.items)) return raw.items
  if (Array.isArray(raw.content)) return raw.content
  return []
}

function normalizePetWork(raw: unknown): PetWork | null {
  if (!isRecord(raw)) return null
  const id = stringValue(raw.id, stringValue(raw.workId))
  if (!id) return null
  const draft = normalizePetDraft(raw.draft || raw.payload || raw.draftJson)
  return {
    id,
    title: stringValue(raw.title, draft.prompt || '宠物作品'),
    templateTitle: stringValue(raw.templateTitle ?? raw.templateName, '自定义创作'),
    petType: normalizePetType(raw.petType, draft.roles[0]?.type || 'other'),
    status: normalizePetWorkStatus(raw.status),
    aspectRatio: normalizeAspectRatio(raw.aspectRatio, draft.aspectRatio),
    durationSeconds: numberValue(raw.durationSeconds, draft.durationSeconds),
    coverUrl: stringValue(raw.coverUrl ?? raw.thumbnailUrl),
    videoUrl: stringValue(raw.videoUrl ?? raw.previewUrl),
    downloadUrl: stringValue(raw.downloadUrl),
    draft,
    errorCode: stringValue(raw.errorCode),
    errorMessage: stringValue(raw.errorMessage ?? raw.failReason ?? raw.message),
    retryable: typeof raw.retryable === 'boolean' ? raw.retryable : undefined,
    createdAt: stringValue(raw.createdAt, new Date().toLocaleString('zh-CN', { hour12: false })),
  }
}

function normalizePetEstimate(raw: unknown, payload: PetCreationDraft): PetVideoEstimate {
  const validation = validatePetCreationDraft(payload)
  const fallbackCost = estimatedPetFallbackCost(payload, validation.mode)
  if (!isRecord(raw)) {
    return {
      taskType: validation.mode === 'text_video' ? 'SEEDANCE_TEXT_VIDEO' : 'SEEDANCE_REFERENCE_VIDEO',
      generationMode: validation.mode,
      estimatedCreditCost: fallbackCost,
      balance: null,
      enoughBalance: null,
      pricingSource: 'FRONTEND_FALLBACK',
      materialCount: payload.materials.length,
      shotCount: payload.shots.length,
      warnings: validation.warnings.map((issue) => issue.message),
    }
  }
  return {
    taskType: stringValue(raw.taskType, validation.mode === 'text_video' ? 'SEEDANCE_TEXT_VIDEO' : 'SEEDANCE_REFERENCE_VIDEO'),
    generationMode: normalizeGenerationMode(raw.generationMode, validation.mode),
    estimatedCreditCost: Math.max(0, Math.round(numberValue(raw.estimatedCreditCost, fallbackCost))),
    balance: raw.balance == null ? null : Math.max(0, Math.round(numberValue(raw.balance, 0))),
    enoughBalance: typeof raw.enoughBalance === 'boolean' ? raw.enoughBalance : null,
    pricingSource: stringValue(raw.pricingSource, 'PET_ESTIMATE'),
    materialCount: Math.max(0, Math.round(numberValue(raw.materialCount, payload.materials.length))),
    shotCount: Math.max(0, Math.round(numberValue(raw.shotCount, payload.shots.length))),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((item) => String(item)).filter(Boolean) : validation.warnings.map((issue) => issue.message),
  }
}

function mockPetPromptPreview(payload: PetCreationDraft) {
  return [
    'System: Create a polished short pet video for social media.',
    `Core idea: ${payload.prompt.trim()}`,
    `Generation mode: ${inferPetGenerationMode(payload)}`,
    `Style and camera: ${payload.style}, ${payload.aspectRatio}, ${payload.durationSeconds} seconds.`,
    'Quality constraints: Keep the main pet appearance, fur color, fur pattern, face, body shape, and personality stable across all shots.',
  ].join('\n')
}

function normalizeUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizePetPreview(raw: unknown, payload: PetCreationDraft): PetVideoPreview {
  const validation = validatePetCreationDraft(payload)
  const fallbackCost = estimatedPetFallbackCost(payload, validation.mode)
  const fallbackPayload: Record<string, unknown> = {
    provider: 'seedance',
    businessType: 'pet_creation',
    generationMode: validation.mode,
    durationSeconds: payload.durationSeconds,
    aspectRatio: payload.aspectRatio,
    style: payload.style,
    language: payload.language,
    providerSubmitted: false,
    taskCreated: false,
    imageUrls: payload.materials.filter((item) => item.role !== 'audio').map((item) => item.url).filter(Boolean),
    prompt: mockPetPromptPreview(payload),
  }
  if (!isRecord(raw)) {
    return {
      dryRun: true,
      providerSubmitEnabled: false,
      dryRunEnabled: true,
      providerSubmitted: false,
      taskCreated: false,
      wouldCreateTask: validation.canSubmit,
      errorCode: 'MOCK_DRY_RUN',
      message: '当前为本地 mock 预检，未调用第三方视频生成。',
      taskType: validation.mode === 'text_video' ? 'SEEDANCE_TEXT_VIDEO' : 'SEEDANCE_REFERENCE_VIDEO',
      generationMode: validation.mode,
      estimatedCreditCost: fallbackCost,
      balance: null,
      enoughBalance: null,
      pricingSource: 'FRONTEND_DRY_RUN',
      modelCode: '',
      durationSeconds: payload.durationSeconds,
      aspectRatio: payload.aspectRatio,
      style: payload.style,
      language: payload.language,
      promptPreview: mockPetPromptPreview(payload),
      negativePrompt: 'No car sales script, no vehicle model, no dealership promotion, no extra animals, no fused pets, no changed breed, no unreadable subtitles.',
      payloadPreview: fallbackPayload,
      materialSummary: payload.materials,
      storyboardShots: payload.shots,
      warnings: validation.warnings.map((issue) => issue.message),
    }
  }
  return {
    dryRun: raw.dryRun !== false,
    providerSubmitEnabled: raw.providerSubmitEnabled === true,
    dryRunEnabled: raw.dryRunEnabled !== false,
    providerSubmitted: raw.providerSubmitted === true,
    taskCreated: raw.taskCreated === true,
    wouldCreateTask: raw.wouldCreateTask !== false,
    errorCode: stringValue(raw.errorCode),
    message: stringValue(raw.message, 'Dry-run 已完成，未调用第三方视频生成。'),
    taskType: stringValue(raw.taskType, validation.mode === 'text_video' ? 'SEEDANCE_TEXT_VIDEO' : 'SEEDANCE_REFERENCE_VIDEO'),
    generationMode: normalizeGenerationMode(raw.generationMode, validation.mode),
    estimatedCreditCost: Math.max(0, Math.round(numberValue(raw.estimatedCreditCost, fallbackCost))),
    balance: raw.balance == null ? null : Math.max(0, Math.round(numberValue(raw.balance, 0))),
    enoughBalance: typeof raw.enoughBalance === 'boolean' ? raw.enoughBalance : null,
    pricingSource: stringValue(raw.pricingSource, 'PET_DRY_RUN'),
    modelCode: stringValue(raw.modelCode),
    durationSeconds: Math.max(0, Math.round(numberValue(raw.durationSeconds, payload.durationSeconds))),
    aspectRatio: normalizeAspectRatio(raw.aspectRatio, payload.aspectRatio),
    style: normalizeStyle(raw.style, payload.style),
    language: stringValue(raw.language, payload.language),
    promptPreview: stringValue(raw.promptPreview, mockPetPromptPreview(payload)),
    negativePrompt: stringValue(raw.negativePrompt),
    payloadPreview: isRecord(raw.payloadPreview) ? raw.payloadPreview : fallbackPayload,
    materialSummary: normalizeUnknownArray(raw.materialSummary),
    storyboardShots: normalizeUnknownArray(raw.storyboardShots),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((item) => String(item)).filter(Boolean) : validation.warnings.map((issue) => issue.message),
  }
}

function petEstimateFallback(payload: PetCreationDraft) {
  const validation = validatePetCreationDraft(payload)
  return getBillingEstimate({
    taskType: validation.mode === 'text_video' ? 'SEEDANCE_TEXT_VIDEO' : 'SEEDANCE_REFERENCE_VIDEO',
    durationSeconds: payload.durationSeconds,
    imageCount: Math.max(1, payload.materials.filter((material) => material.role !== 'audio').length),
  }).then((data) =>
    normalizePetEstimate(
      {
        ...data,
        generationMode: validation.mode,
        materialCount: payload.materials.length,
        shotCount: payload.shots.length,
        warnings: validation.warnings.map((issue) => issue.message),
      },
      payload,
    ),
  )
}

function normalizePetWorkDownload(raw: unknown, workId: string): PetWorkDownload {
  if (isRecord(raw)) {
    const url = stringValue(raw.url ?? raw.downloadUrl)
    return {
      fileName: stringValue(raw.fileName, url ? `${workId}.mp4` : `${workId}.json`),
      url,
      content: stringValue(raw.content),
      mimeType: stringValue(raw.mimeType, url ? 'video/mp4' : 'application/json'),
    }
  }
  return {
    fileName: `${workId}.json`,
    url: '',
    content: typeof raw === 'string' ? raw : '',
    mimeType: 'application/json',
  }
}

export function listPetTemplates() {
  return mockListPetTemplates()
}

export function getPetDraft() {
  return mockGetPetDraft()
}

export function savePetDraft(payload: PetCreationDraft) {
  return mockSavePetDraft(payload)
}

export function resetPetDraft() {
  return mockResetPetDraft()
}

export function generatePetStoryboard(payload: PetCreationDraft) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>('/pet-videos/storyboard', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((data) => normalizePetDraft(data, payload)),
    () => mockGeneratePetStoryboard(payload),
  )
}

export function generatePetScript(payload: PetCreationDraft) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>('/pet-videos/script', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((data) => normalizePetDraft(data, payload)),
    () => mockGeneratePetScript(payload),
  )
}

export function estimatePetVideoCost(payload: PetCreationDraft) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>('/pet-videos/estimate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((data) => normalizePetEstimate(data, payload)),
    () => petEstimateFallback(payload),
  )
}

export function previewPetVideoTask(payload: PetCreationDraft) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>('/pet-videos/tasks/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((data) => normalizePetPreview(data, payload)),
    () => Promise.resolve(normalizePetPreview(null, payload)),
  )
}

export function createPetVideoTask(payload: PetCreationDraft) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>('/pet-videos/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Idempotency-Key': `pet-video:${crypto.randomUUID?.() || Date.now()}`,
        },
      }).then((data) => normalizePetVideoTask(data, payload) || mockCreatePetVideoTask(payload)),
    () => mockCreatePetVideoTask(payload),
  )
}

export function getPetVideoTask(taskId?: string) {
  assertPetCreationAccess()
  if (!taskId) return mockGetPetVideoTask(taskId)
  return withMockFallback(
    () => request<unknown>(`/pet-videos/tasks/${encodeURIComponent(taskId)}`).then((data) => normalizePetVideoTask(data)),
    () => mockGetPetVideoTask(taskId).then((data) => normalizePetVideoTask(data)),
  )
}

export function listPetWorks(params: PetWorkQuery = {}) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>(`/pet-videos/works${workQueryString(params)}`).then((data) =>
        extractList(data).map((item) => normalizePetWork(item)).filter((item): item is PetWork => Boolean(item)),
      ),
    () => mockListPetWorks(params),
  )
}

export function forkPetWork(workId: string, options: PetWorkForkOptions = {}) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>(`/pet-videos/works/${encodeURIComponent(workId)}/fork`, {
        method: 'POST',
        body: JSON.stringify(options),
      }).then((data) => normalizePetWork(data) || mockForkPetWork(workId, options)),
    () => mockForkPetWork(workId, options),
  )
}

export function regeneratePetWork(workId: string) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<unknown>(`/pet-videos/works/${encodeURIComponent(workId)}/regenerate`, {
        method: 'POST',
      }).then((data) => normalizePetVideoTask(data) || mockRegeneratePetWork(workId)),
    () => mockRegeneratePetWork(workId),
  )
}

export function deletePetWork(workId: string) {
  assertPetCreationAccess()
  return withMockFallback(
    () =>
      request<void>(`/pet-videos/works/${encodeURIComponent(workId)}`, {
        method: 'DELETE',
      }),
    () => mockDeletePetWork(workId),
  )
}

export function downloadPetWork(workId: string) {
  assertPetCreationAccess()
  return withMockFallback(
    () => request<unknown>(`/pet-videos/works/${encodeURIComponent(workId)}/download`).then((data) => normalizePetWorkDownload(data, workId)),
    () => mockDownloadPetWork(workId),
  )
}
