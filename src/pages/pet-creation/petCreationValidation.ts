import type {
  PetCreationDraft,
  PetGenerationMode,
  PetReferenceMaterial,
  PetRole,
  PetStoryboardShot,
} from './petCreationTypes'

export type PetValidationSeverity = 'error' | 'warning' | 'info'

export interface PetValidationIssue {
  field: string
  message: string
  severity: PetValidationSeverity
  blocking: boolean
}

export interface PetValidationResult {
  mode: PetGenerationMode
  issues: PetValidationIssue[]
  blockingIssues: PetValidationIssue[]
  warnings: PetValidationIssue[]
  canSubmit: boolean
}

const ALLOWED_MATERIAL_ROLES = new Set(['main_pet', 'second_pet', 'prop', 'scene', 'audio'])
const ALLOWED_PET_TYPES = new Set(['cat', 'dog', 'other'])
const ALLOWED_RATIOS = new Set(['9:16', '16:9', '1:1'])
const ALLOWED_DURATIONS = new Set([5, 10, 15, 30])
const ALLOWED_STYLES = new Set(['realistic', 'cute', 'anime', 'anthropomorphic', 'funny', 'healing'])

const PLACEHOLDER_PROMPTS = [
  '描述你想要的宠物视频',
  '请输入',
  '测试',
  'test',
  'demo',
  'placeholder',
  '小猫晚上偷偷出门',
]

const CAR_POLLUTION_KEYWORDS = [
  '汽车销售',
  '车型',
  '车辆卖点',
  '车型卖点',
  '试驾',
  '门店促销',
  '续航里程',
  '到店促销',
  '购车权益',
]

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif)(\?|#|$)/i
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i

export function petErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (error instanceof Error && error.message.trim()) {
    if (error.message.includes('Failed to fetch')) return '网络连接失败，请检查后端服务或稍后重试。'
    if (error.message.includes('timeout') || error.message.includes('超时')) return '请求超时，请稍后重试。'
    return normalizeBackendPetError(error.message)
  }
  return fallback
}

export function petFailureMessage(errorCode?: string, errorMessage?: string) {
  const code = (errorCode || '').trim().toUpperCase()
  if (code === 'VALIDATION_ERROR' || code === 'PET_VALIDATION_ERROR') return errorMessage || '生成参数校验失败，请检查创意、角色、素材和分镜。'
  if (code === 'PERMISSION_DENIED') return '当前账号没有宠物创作权限。'
  if (code === 'INSUFFICIENT_CREDIT') return '当前积分余额不足，请充值或降低生成配置后再提交。'
  if (code === 'MATERIAL_INVALID' || code === 'PET_MATERIAL_INVALID') return errorMessage || '宠物素材不可用，请检查素材 URL、资产或数量限制。'
  if (code === 'PROVIDER_SUBMIT_FAILED') return errorMessage || '视频服务提交失败，请稍后重试。'
  if (code === 'PROVIDER_SUBMIT_DISABLED') return errorMessage || '当前为本地安全测试模式，未调用第三方视频生成。'
  if (code === 'PROVIDER_TIMEOUT') return errorMessage || '视频服务生成超时，可稍后重试。'
  if (code === 'PROVIDER_GENERATION_FAILED') return errorMessage || '视频生成失败，请调整素材、台词或分镜后重试。'
  if (code === 'RESULT_SAVE_FAILED') return errorMessage || '视频结果保存失败，请稍后重试。'
  if (code === 'WORK_SYNC_FAILED') return errorMessage || '作品状态同步失败，请刷新作品列表。'
  if (code === 'TASK_RETRYABLE') return errorMessage || '任务临时失败，支持重新生成。'
  if (code === 'TASK_FAILED') return errorMessage || '任务生成失败，请检查参数后重新提交。'
  return errorMessage?.trim() || '生成失败，请检查宠物素材、台词和分镜后重试。'
}

function normalizeBackendPetError(message: string) {
  if (message.includes('PET_VALIDATION_ERROR')) return message.replace('PET_VALIDATION_ERROR: ', '')
  if (message.includes('PET_MATERIAL_INVALID')) return message.replace('PET_MATERIAL_INVALID: ', '')
  if (message.includes('INSUFFICIENT_CREDIT')) return '当前积分余额不足，请充值或降低生成配置后再提交。'
  if (message.includes('PROVIDER_SUBMIT_DISABLED')) return '当前为本地安全测试模式，未调用第三方视频生成。'
  return message
}

export function hasPrompt(draft: Pick<PetCreationDraft, 'prompt'>) {
  return Boolean(draft.prompt?.trim())
}

export function hasMainPetMaterial(draft: Pick<PetCreationDraft, 'materials'>) {
  return draft.materials.some((material) => material.role === 'main_pet' && hasMaterialLocator(material))
}

export function validDialogueLines(draft: Pick<PetCreationDraft, 'dialogueLines'>) {
  return draft.dialogueLines.filter((line) => line.text.trim())
}

export function validStoryboardShots(draft: Pick<PetCreationDraft, 'shots'>) {
  return draft.shots.filter(isUsableShot)
}

export function isUsableShot(shot: PetStoryboardShot) {
  return Boolean(shot.frameDescription.trim() || shot.characterAction.trim() || shot.subtitle.trim())
}

export function promptRequiredMessage() {
  return '请先填写宠物视频创意描述，再继续生成。'
}

export function mainPetMaterialWarning() {
  return '真实生成默认需要主宠物素材；如需无参考图生成，请在生成模式中明确选择“纯文本生成”。'
}

export function inferPetGenerationMode(draft: Pick<PetCreationDraft, 'generationMode' | 'videoType' | 'materials'>): PetGenerationMode {
  if (draft.generationMode) return draft.generationMode
  if (draft.videoType === 'image_to_video') return 'image_to_video'
  if (draft.videoType === 'dialogue') return 'dialogue_video'
  return hasMainPetMaterial(draft) ? 'reference_video' : 'text_video'
}

export function validatePetCreationDraft(draft: PetCreationDraft): PetValidationResult {
  const issues: PetValidationIssue[] = []
  const mode = inferPetGenerationMode(draft)

  validatePrompt(draft, issues)
  validateBaseParams(draft, issues)
  validateMaterials(draft, mode, issues)
  validateRoles(draft, mode, issues)
  validateDialogue(draft, mode, issues)
  validateStoryboard(draft, issues)
  validateAudioAndSubtitle(draft, issues)

  const blockingIssues = issues.filter((issue) => issue.blocking)
  return {
    mode,
    issues,
    blockingIssues,
    warnings: issues.filter((issue) => !issue.blocking),
    canSubmit: blockingIssues.length === 0,
  }
}

export function firstBlockingPetIssue(draft: PetCreationDraft) {
  return validatePetCreationDraft(draft).blockingIssues[0]
}

export function estimatedPetFallbackCost(draft: PetCreationDraft, mode = inferPetGenerationMode(draft)) {
  const base = mode === 'text_video' ? 200 : 220
  const durationExtra = draft.durationSeconds > 15 ? 80 : 0
  const voiceExtra = draft.voiceEnabled ? 20 : 0
  const lipSyncExtra = draft.lipSyncEnabled ? 20 : 0
  return base + durationExtra + voiceExtra + lipSyncExtra
}

function validatePrompt(draft: PetCreationDraft, issues: PetValidationIssue[]) {
  const prompt = draft.prompt.trim()
  if (!prompt) {
    pushIssue(issues, 'prompt', promptRequiredMessage())
    return
  }
  if (prompt.length < 10) {
    pushIssue(issues, 'prompt', '创意描述至少需要 10 个字，避免模型只收到过短指令。')
  }
  if (prompt.length > 500) {
    pushIssue(issues, 'prompt', '创意描述不能超过 500 字，请压缩后再提交。')
  }
  if (PLACEHOLDER_PROMPTS.some((item) => prompt.toLowerCase() === item.toLowerCase() || prompt.includes(item))) {
    pushIssue(issues, 'prompt', '创意描述不能使用占位示例，请替换为真实宠物剧情。')
  }
  const carKeyword = CAR_POLLUTION_KEYWORDS.find((keyword) => prompt.includes(keyword))
  if (carKeyword) {
    pushIssue(issues, 'prompt', `创意描述疑似混入车辆创作词「${carKeyword}」，请改成宠物视频语境。`)
  }
}

function validateBaseParams(draft: PetCreationDraft, issues: PetValidationIssue[]) {
  if (!ALLOWED_RATIOS.has(draft.aspectRatio)) pushIssue(issues, 'aspectRatio', '视频比例仅支持 9:16、16:9、1:1。')
  if (!ALLOWED_DURATIONS.has(draft.durationSeconds)) pushIssue(issues, 'durationSeconds', '视频时长仅支持 5、10、15、30 秒。')
  if (!ALLOWED_STYLES.has(draft.style)) pushIssue(issues, 'style', '画面风格不在宠物创作支持范围内。')
  if ((draft.visualSettings.backgroundPrompt || '').trim().length > 160) {
    pushIssue(issues, 'visualSettings.backgroundPrompt', '背景图/场景要求不能超过 160 字。')
  }
  if ((draft.visualSettings.productPrompt || '').trim().length > 160) {
    pushIssue(issues, 'visualSettings.productPrompt', '产品/道具展示要求不能超过 160 字。')
  }
}

function validateMaterials(draft: PetCreationDraft, mode: PetGenerationMode, issues: PetValidationIssue[]) {
  const counts = new Map<string, number>()
  const seen = new Set<string>()

  for (const material of draft.materials) {
    if (!ALLOWED_MATERIAL_ROLES.has(material.role)) {
      pushIssue(issues, 'materials', `素材「${material.label || material.id}」的角色不合法。`)
      continue
    }
    counts.set(material.role, (counts.get(material.role) || 0) + 1)
    if (!hasMaterialLocator(material)) {
      pushIssue(issues, 'materials', `素材「${material.label || material.id}」缺少 URL 或资产 ID。`)
      continue
    }
    if (material.url && !isAllowedUrl(material.url) && !material.assetId) {
      pushIssue(issues, 'materials', `素材「${material.label || material.id}」URL 不可识别，请使用 http(s)、asset:// 或 tos:// 地址。`)
    }
    if (material.url && material.role === 'audio' && !looksLikeAudio(material.url) && !material.assetId) {
      pushIssue(issues, 'materials', `音频素材「${material.label || material.id}」不是可识别的音频地址。`)
    }
    if (material.url && material.role !== 'audio' && !looksLikeImage(material.url) && !material.assetId) {
      pushIssue(issues, 'materials', `图片素材「${material.label || material.id}」不是可识别的图片地址。`)
    }
    const duplicateKey = `${material.role}:${material.assetId || material.url}`
    if (seen.has(duplicateKey)) {
      pushIssue(issues, 'materials', `素材「${material.label || material.id}」重复添加。`)
    }
    seen.add(duplicateKey)
  }

  if (mode !== 'text_video' && !hasMainPetMaterial(draft)) {
    pushIssue(issues, 'materials.main_pet', '请先添加主宠物参考图，或明确切换为纯文本生成模式。')
  }
  if (mode === 'text_video' && !hasMainPetMaterial(draft)) {
    pushIssue(issues, 'materials.main_pet', '未提供主宠物素材，将使用纯文本生成，角色一致性会降低。', 'warning')
  }
  enforceCount(issues, counts, 'main_pet', 3, '主宠物素材最多 3 张。')
  enforceCount(issues, counts, 'second_pet', 3, '第二/更多宠物素材最多 3 张。')
  enforceCount(issues, counts, 'prop', 4, '产品/道具参考素材最多 4 张。')
  enforceCount(issues, counts, 'scene', 4, '场景参考素材最多 4 张。')
  enforceCount(issues, counts, 'audio', 1, '音频参考素材最多 1 条。')
}

function validateRoles(draft: PetCreationDraft, mode: PetGenerationMode, issues: PetValidationIssue[]) {
  const roles = draft.roles.filter((role) => role.name.trim())
  if (roles.length === 0) {
    pushIssue(issues, 'roles', '至少需要配置一个宠物角色。')
    return
  }
  const names = new Set<string>()
  for (const role of roles) {
    validateRole(role, issues)
    const name = role.name.trim()
    if (names.has(name)) {
      pushIssue(issues, 'roles', `宠物角色名称「${name}」重复，请改成可区分的名称。`)
    }
    names.add(name)
  }
  if ((mode === 'dialogue_video' || draft.videoType === 'dialogue') && roles.length < 2) {
    pushIssue(issues, 'roles', '宠物对话视频至少需要两个宠物角色，也可以继续添加更多角色。')
  }
  if ((mode === 'dialogue_video' || draft.videoType === 'dialogue') && !hasSecondPetMaterial(draft)) {
    pushIssue(issues, 'materials.second_pet', '多宠物对话建议补充第二或更多宠物参考图，否则非主角角色一致性会下降。', 'warning')
  }
}

function validateRole(role: PetRole, issues: PetValidationIssue[]) {
  if (!role.name.trim()) pushIssue(issues, 'roles.name', '宠物角色名称不能为空。')
  if (!ALLOWED_PET_TYPES.has(role.type)) pushIssue(issues, 'roles.type', `角色「${role.name || role.id}」宠物类型不合法。`)
  if (role.personalityTags.length === 0) pushIssue(issues, 'roles.personalityTags', `角色「${role.name || role.id}」至少需要一个性格标签。`)
  if (!role.speakingTone?.trim()) pushIssue(issues, 'roles.speakingTone', `角色「${role.name || role.id}」需要设置说话口吻。`)
}

function validateDialogue(draft: PetCreationDraft, mode: PetGenerationMode, issues: PetValidationIssue[]) {
  const lines = validDialogueLines(draft)
  const roleIds = new Set(draft.roles.map((role) => role.id))
  const requiresDialogue = draft.voiceEnabled || draft.lipSyncEnabled || mode === 'dialogue_video' || draft.videoType === 'dialogue'

  if (requiresDialogue && lines.length === 0) {
    pushIssue(issues, 'dialogueLines', '当前配置需要台词，请至少填写一条有效台词。')
  }
  for (const line of lines) {
    if (!roleIds.has(line.speakerRoleId)) {
      pushIssue(issues, 'dialogueLines.speakerRoleId', `台词「${line.text.slice(0, 12)}」没有匹配到说话角色。`)
    }
    if (line.text.trim().length > 80) {
      pushIssue(issues, 'dialogueLines.text', '单条台词建议控制在 80 字内，过长会影响配音和口型同步。')
    }
  }
}

function validateStoryboard(draft: PetCreationDraft, issues: PetValidationIssue[]) {
  const shots = validStoryboardShots(draft)
  if (shots.length === 0) {
    pushIssue(issues, 'shots', '建议先生成或编辑分镜；没有分镜会降低视频稳定性。', 'warning')
    return
  }
  if (shots.length < 3) pushIssue(issues, 'shots', '正式生成至少需要 3 个有效分镜。')
  if (shots.length > 8) pushIssue(issues, 'shots', '分镜最多 8 个，请合并后再提交。')

  let totalSeconds = 0
  for (const shot of shots) {
    totalSeconds += Number(shot.durationSeconds || 0)
    if (!shot.durationSeconds || shot.durationSeconds < 1) {
      pushIssue(issues, 'shots.durationSeconds', `镜头 ${shot.index} 时长不能小于 1 秒。`)
    }
    if (shot.durationSeconds > 8) {
      pushIssue(issues, 'shots.durationSeconds', `镜头 ${shot.index} 时长不能超过 8 秒。`)
    }
    if (!shot.frameDescription.trim()) pushIssue(issues, 'shots.frameDescription', `镜头 ${shot.index} 缺少画面描述。`)
    if (!shot.characterAction.trim()) pushIssue(issues, 'shots.characterAction', `镜头 ${shot.index} 缺少角色动作。`)
    if (!shot.cameraMove.trim()) pushIssue(issues, 'shots.cameraMove', `镜头 ${shot.index} 缺少运镜方式。`)
    if (!shot.subtitle.trim() && draft.subtitleEnabled) {
      pushIssue(issues, 'shots.subtitle', `镜头 ${shot.index} 开启字幕但缺少字幕/旁白文本。`)
    }
    if (shot.subtitle.trim().length > 36) {
      pushIssue(issues, 'shots.subtitle', `镜头 ${shot.index} 字幕过长，建议控制在 36 字内。`)
    }
  }
  if (Math.abs(totalSeconds - draft.durationSeconds) > Math.max(3, draft.durationSeconds * 0.35)) {
    pushIssue(
      issues,
      'shots.durationSeconds',
      `分镜总时长 ${totalSeconds} 秒与目标 ${draft.durationSeconds} 秒差距过大，请重新生成或调整分镜。`,
    )
  }
}

function validateAudioAndSubtitle(draft: PetCreationDraft, issues: PetValidationIssue[]) {
  const dialogueCount = validDialogueLines(draft).length
  const shotSubtitles = validStoryboardShots(draft).filter((shot) => shot.subtitle.trim()).length
  const hasScript = Boolean(draft.scriptText?.trim())

  if (draft.lipSyncEnabled && !draft.voiceEnabled) {
    pushIssue(issues, 'lipSyncEnabled', '开启口型同步时必须同时开启配音。')
  }
  if (draft.lipSyncEnabled && dialogueCount === 0) {
    pushIssue(issues, 'lipSyncEnabled', '开启口型同步时必须存在有效台词和说话角色。')
  }
  if (draft.voiceEnabled && dialogueCount === 0 && !hasScript) {
    pushIssue(issues, 'voiceEnabled', '开启配音时需要台词或脚本文案。')
  }
  if (!draft.voiceEnabled && draft.lipSyncEnabled === false) {
    pushIssue(issues, 'voiceEnabled', '未开启配音时，视频只会保留字幕/大字报风格，不会生成宠物口播。', 'info')
  }
  if (draft.subtitleEnabled && !hasScript && dialogueCount === 0 && shotSubtitles === 0) {
    pushIssue(issues, 'subtitleEnabled', '开启字幕时至少需要脚本、台词或分镜字幕。')
  }
  if (draft.subtitleEnabled) {
    pushIssue(issues, 'subtitleEnabled', '字幕会作为生成建议写入任务；真实烧录字幕仍依赖后端后处理能力。', 'warning')
  }
  if (draft.bgmEnabled && !draft.materials.some((material) => material.role === 'audio')) {
    pushIssue(issues, 'bgmEnabled', '未选择 BGM 时将使用默认背景音乐策略，且不会把 BGM 当作口播音频。', 'warning')
  }
}

function hasMaterialLocator(material: PetReferenceMaterial) {
  return Boolean(material.assetId?.trim() || material.url?.trim())
}

function hasSecondPetMaterial(draft: Pick<PetCreationDraft, 'materials'>) {
  return draft.materials.some((material) => material.role === 'second_pet' && hasMaterialLocator(material))
}

function isAllowedUrl(url: string) {
  const value = url.trim().toLowerCase()
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('asset://') ||
    value.startsWith('tos://') ||
    value.startsWith('/assets/') ||
    value.startsWith('/uploads/')
  )
}

function looksLikeImage(url: string) {
  const value = url.trim()
  return IMAGE_EXT_RE.test(value) || value.startsWith('asset://') || value.startsWith('tos://') || value.startsWith('/assets/')
}

function looksLikeAudio(url: string) {
  const value = url.trim()
  return AUDIO_EXT_RE.test(value) || value.startsWith('asset://') || value.startsWith('tos://')
}

function enforceCount(issues: PetValidationIssue[], counts: Map<string, number>, role: string, max: number, message: string) {
  if ((counts.get(role) || 0) > max) pushIssue(issues, `materials.${role}`, message)
}

function pushIssue(
  issues: PetValidationIssue[],
  field: string,
  message: string,
  severity: PetValidationSeverity = 'error',
) {
  issues.push({
    field,
    message,
    severity,
    blocking: severity === 'error',
  })
}
