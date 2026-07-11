import { clonePetDraft } from './petCreationMock'
import { normalizePetVideoDurationSeconds } from './petCreationValidation'
import type {
  PetAspectRatio,
  PetCreationDraft,
  PetCreationStyle,
  PetDialogueEmotion,
  PetDialogueLine,
  PetReferenceMaterial,
  PetRole,
  PetStoryboardShot,
  PetTextStrokeMode,
  PetVideoType,
} from './petCreationTypes'

type JsonRecord = Record<string, unknown>
type ImportMaterialRole = Extract<PetReferenceMaterial['role'], 'main_pet' | 'second_pet' | 'human_avatar' | 'scene' | 'prop'>

export interface PetCreationAssetImportOptions {
  assetId?: number
  fileName?: string
  title?: string
  sourceUrl?: string
}

export interface PetCreationAssetImportResult {
  draft: PetCreationDraft
  kind: 'dialogue' | 'storyboard'
  title: string
  templateId: string
  routeName: 'pet-dialogue-create' | 'pet-storyboard'
  requiredMaterialRoles: ImportMaterialRole[]
  materialKeywords: Partial<Record<ImportMaterialRole, string>>
  importedDialogueCount: number
  importedShotCount: number
}

export function importPetCreationAssetContent(
  baseDraft: PetCreationDraft,
  content: string,
  options: PetCreationAssetImportOptions = {},
): PetCreationAssetImportResult {
  const parsed = parseAssetContent(content)
  const source = selectDraftSource(parsed)
  const draft = clonePetDraft(baseDraft)
  const title = firstText(
    source.title,
    source.name,
    parsed.title,
    options.title,
    readableNameFromFile(options.fileName),
    '宠物创作方案',
  )
  const rawDialogueLines = extractDialogueRecords(source, parsed)
  const speakerNames = extractSpeakerNames(rawDialogueLines, source, parsed)
  const roles = buildRoles(source, parsed, speakerNames, draft.roles)
  const dialogueLines = buildDialogueLines(rawDialogueLines, roles, source, parsed)
  const shots = buildShots(source, parsed)
  const declaredKind = firstText(source.assetKind, source.kind, parsed.assetKind, parsed.kind).toLowerCase()
  const kind: PetCreationAssetImportResult['kind'] = declaredKind.includes('storyboard')
    ? 'storyboard'
    : declaredKind.includes('dialogue') || dialogueLines.length > 0
      ? 'dialogue'
      : 'storyboard'
  const duration = resolveDuration(source, parsed, shots, draft.durationSeconds)
  const templateId = firstText(
    source.templateId,
    parsed.templateId,
    kind === 'dialogue' ? 'multi-pet-dialogue' : 'viral-benchmark-storyboard',
  )

  draft.templateId = templateId
  draft.prompt = buildPrompt(title, source, parsed, options.sourceUrl)
  draft.videoType = resolveVideoType(source, parsed, kind)
  draft.generationMode = kind === 'dialogue' ? 'dialogue_video' : 'reference_video'
  draft.roles = roles
  draft.dialogueLines = dialogueLines
  draft.shots = fitShotDurations(shots, duration)
  draft.durationSeconds = duration
  draft.aspectRatio = resolveAspectRatio(source, parsed, draft.aspectRatio)
  draft.style = resolveStyle(source, parsed, draft.style)
  draft.scriptText = buildScriptText(source, parsed, roles, dialogueLines, draft.shots)
  draft.subtitleEnabled = booleanValue(source.subtitleEnabled, parsed.subtitleEnabled, true)
  draft.voiceEnabled = booleanValue(source.voiceEnabled, parsed.voiceEnabled, kind === 'dialogue')
  draft.lipSyncEnabled = booleanValue(source.lipSyncEnabled, parsed.lipSyncEnabled, kind === 'dialogue')
  draft.bgmEnabled = booleanValue(source.bgmEnabled, parsed.bgmEnabled, true)
  draft.subtitleStyle = {
    ...draft.subtitleStyle,
    ...readSubtitleStyle(source.subtitleStyle),
    ...readSubtitleStyle(parsed.subtitleStyle),
  }
  draft.visualSettings = {
    ...draft.visualSettings,
    ...readVisualSettings(source.visualSettings),
    ...readVisualSettings(parsed.visualSettings),
  }
  draft.consistency = {
    ...draft.consistency,
    ...readBooleanRecord(source.consistency),
    ...readBooleanRecord(parsed.consistency),
  }

  const { requiredMaterialRoles, materialKeywords } = resolveMaterialPlan(source, parsed, roles, draft)
  draft.materials = draft.materials.filter((material) => !requiredMaterialRoles.includes(material.role as ImportMaterialRole))
  draft.roles.forEach((role) => { role.referenceAssetIds = [] })

  return {
    draft,
    kind,
    title,
    templateId,
    routeName: kind === 'dialogue' ? 'pet-dialogue-create' : 'pet-storyboard',
    requiredMaterialRoles,
    materialKeywords,
    importedDialogueCount: dialogueLines.length,
    importedShotCount: draft.shots.length,
  }
}

function parseAssetContent(content: string): JsonRecord {
  const value = String(content || '').trim()
  if (!value) throw new Error('资产内容为空，无法导入。')
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return { scripts: parsed }
    if (isRecord(parsed)) return parsed
  } catch {
    return { scriptText: value }
  }
  return { scriptText: value }
}

function selectDraftSource(parsed: JsonRecord) {
  for (const key of ['draft', 'draftSnapshot', 'composition', 'payload', 'content']) {
    const candidate = asRecord(parsed[key])
    if (candidate && hasCreationFields(candidate)) return candidate
  }
  const diagnostics = asRecord(parsed.diagnosticMetadata)
  const diagnosticDraft = diagnostics ? asRecord(diagnostics.draftSnapshot) : null
  return diagnosticDraft && hasCreationFields(diagnosticDraft) ? diagnosticDraft : parsed
}

function hasCreationFields(value: JsonRecord) {
  return ['dialogueLines', 'dialogues', 'shots', 'storyboard', 'scripts', 'roles', 'characters', 'scriptText']
    .some((key) => value[key] != null)
}

function extractDialogueRecords(source: JsonRecord, parsed: JsonRecord) {
  for (const key of ['dialogueLines', 'dialogues', 'lines']) {
    const rows = recordArray(source[key])
    if (rows.length) return rows
  }
  for (const key of ['dialogueLines', 'dialogues', 'lines']) {
    const rows = recordArray(parsed[key])
    if (rows.length) return rows
  }
  const text = firstText(source.scriptText, source.script, parsed.scriptText, parsed.script, parsed.copywriting)
  const parsedLines = parseDialogueText(text)
  if (parsedLines.length) return parsedLines
  const scripts = recordArray(source.scripts).length ? recordArray(source.scripts) : recordArray(parsed.scripts)
  return scripts.flatMap((row) => parseDialogueText(firstText(row.content, row.subtitle, row.narration)))
}

function parseDialogueText(value: string) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\d{1,2}[.、）)]\s*/, ''))
    .map((line) => line.match(/^([^：:]{1,16})[：:]\s*[“"]?(.+?)[”"]?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match?.[1] && match?.[2]))
    .map((match, index) => ({ order: index + 1, speakerName: match[1].trim(), text: match[2].trim() }))
}

function extractSpeakerNames(dialogues: JsonRecord[], source: JsonRecord, parsed: JsonRecord) {
  const roleRecords = extractRoleRecords(source, parsed)
  const idToName = new Map(roleRecords.map((role) => [firstText(role.id, role.roleId), firstText(role.name, role.displayName)]))
  const names: string[] = []
  dialogues.forEach((line) => {
    const speakerId = firstText(line.speakerRoleId, line.roleId, line.speakerId)
    const name = firstText(line.speakerName, line.roleName, line.speaker, idToName.get(speakerId))
    if (name && !names.includes(name)) names.push(name)
  })
  return names
}

function extractRoleRecords(source: JsonRecord, parsed: JsonRecord) {
  for (const key of ['roles', 'characters', 'cast']) {
    const rows = recordArray(source[key])
    if (rows.length) return rows
  }
  for (const key of ['roles', 'characters', 'cast']) {
    const rows = recordArray(parsed[key])
    if (rows.length) return rows
  }
  return []
}

function buildRoles(source: JsonRecord, parsed: JsonRecord, speakerNames: string[], fallbackRoles: PetRole[]) {
  const roleRecords = extractRoleRecords(source, parsed)
  const roles = roleRecords.map((record, index) => roleFromRecord(record, index))
  speakerNames.forEach((name) => {
    if (!roles.some((role) => role.name === name)) roles.push(roleFromRecord({ name }, roles.length))
  })
  if (roles.length) return roles
  return fallbackRoles.slice(0, 2).map((role) => ({ ...role, referenceAssetIds: [] }))
}

function roleFromRecord(record: JsonRecord, index: number): PetRole {
  const name = firstText(record.name, record.displayName, record.roleName, `角色${index + 1}`)
  const type = inferRoleType(firstText(record.type, record.petType, record.kind), `${name} ${firstText(record.description, record.breed)}`)
  const voiceName = firstText(record.voiceName, record.voice, record.voiceProfileName, defaultVoiceName(type, index))
  return {
    id: firstText(record.id, record.roleId, `asset-role-${index + 1}`),
    name,
    type,
    breed: firstText(record.breed, record.appearance) || undefined,
    ageFeel: firstText(record.ageFeel, record.age) || undefined,
    personalityTags: stringArray(record.personalityTags, record.personality, record.tags).slice(0, 6),
    speakingTone: firstText(record.speakingTone, record.tone, record.voiceStyle, voiceName),
    voiceName,
    roleTags: stringArray(record.roleTags, record.functionTags).slice(0, 6),
    anthropomorphic: booleanValue(record.anthropomorphic, true),
    referenceAssetIds: stringArray(record.referenceAssetIds),
  }
}

function buildDialogueLines(rawLines: JsonRecord[], roles: PetRole[], source: JsonRecord, parsed: JsonRecord) {
  const sourceRoles = extractRoleRecords(source, parsed)
  const sourceRoleMap = new Map(sourceRoles.map((record, index) => [
    firstText(record.id, record.roleId, `source-role-${index + 1}`),
    firstText(record.name, record.displayName, record.roleName),
  ]))
  return rawLines
    .map((record, index): PetDialogueLine | null => {
      const text = firstText(record.text, record.content, record.dialogue, record.subtitleText, record.line)
      if (!text || text === '无') return null
      const sourceRoleId = firstText(record.speakerRoleId, record.roleId, record.speakerId)
      const speakerName = firstText(record.speakerName, record.roleName, record.speaker, sourceRoleMap.get(sourceRoleId))
      const role = roles.find((item) => item.id === sourceRoleId)
        || roles.find((item) => item.name === speakerName)
        || roles[index % Math.max(1, roles.length)]
      if (!role) return null
      return {
        id: `asset-dialogue-${String(index + 1).padStart(2, '0')}`,
        speakerRoleId: role.id,
        text: cleanDialogueText(text).slice(0, 80),
        emotion: normalizeEmotion(firstText(record.emotion, record.voiceEmotion)),
        speed: normalizeSpeed(firstText(record.speed)),
        voiceName: firstText(record.voiceName, role.voiceName, defaultVoiceName(role.type, index)),
        lipSync: booleanValue(record.lipSync, true),
      }
    })
    .filter((line): line is PetDialogueLine => Boolean(line))
}

function buildShots(source: JsonRecord, parsed: JsonRecord) {
  let records: JsonRecord[] = []
  for (const key of ['shots', 'storyboard', 'scripts', 'scenes', 'segments']) {
    records = recordArray(source[key])
    if (records.length) break
  }
  if (!records.length) {
    for (const key of ['shots', 'storyboard', 'scripts', 'scenes', 'segments']) {
      records = recordArray(parsed[key])
      if (records.length) break
    }
  }
  return records.map((record, index): PetStoryboardShot => ({
    id: `asset-shot-${String(index + 1).padStart(2, '0')}`,
    index: index + 1,
    durationSeconds: positiveNumber(record.durationSeconds, record.estDurationSec, record.duration, 3),
    frameDescription: firstText(
      record.frameDescription,
      record.visual,
      record.page,
      record.visualPrompt,
      record.scene,
      `镜头${index + 1}：宠物主体保持清晰`,
    ),
    characterAction: firstText(record.characterAction, record.action, record.highlight, record.movement, '宠物完成自然表情和轻微动作'),
    cameraMove: firstText(record.cameraMove, record.cameraMotion, record.camera, record.shotType, record.highlight, '稳定中近景'),
    subtitle: cleanDialogueText(firstText(record.subtitle, record.narration, record.content, record.dialogue)).slice(0, 80),
    voiceEmotion: firstText(record.voiceEmotion, record.emotion, inferEmotion(firstText(record.subtitle, record.content, record.highlight))),
    firstFrameAssetId: firstText(record.firstFrameAssetId) || undefined,
    lastFrameAssetId: firstText(record.lastFrameAssetId) || undefined,
  }))
}

function resolveDuration(source: JsonRecord, parsed: JsonRecord, shots: PetStoryboardShot[], fallback: number) {
  const declared = positiveNumber(source.durationSeconds, parsed.durationSeconds, 0)
  const shotTotal = shots.reduce((sum, shot) => sum + Math.max(1, shot.durationSeconds), 0)
  return normalizePetVideoDurationSeconds(declared || shotTotal || fallback)
}

function fitShotDurations(shots: PetStoryboardShot[], duration: number) {
  if (!shots.length) return shots
  const result = shots.map((shot) => ({ ...shot }))
  const weights = result.map((shot) => Math.max(1, shot.durationSeconds))
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  let assigned = 0
  result.forEach((shot, index) => {
    const isLast = index === result.length - 1
    const next = isLast ? duration - assigned : Math.max(1, Math.round(duration * weights[index] / weightTotal))
    shot.durationSeconds = Math.max(1, next)
    assigned += shot.durationSeconds
  })
  if (assigned !== duration) result[result.length - 1].durationSeconds += duration - assigned
  return result
}

function resolveVideoType(source: JsonRecord, parsed: JsonRecord, kind: 'dialogue' | 'storyboard'): PetVideoType {
  const value = firstText(source.videoType, parsed.videoType)
  const allowed: PetVideoType[] = ['dialogue', 'short_drama', 'monologue', 'talking', 'image_to_video', 'sticker']
  return allowed.includes(value as PetVideoType) ? value as PetVideoType : kind === 'dialogue' ? 'dialogue' : 'short_drama'
}

function resolveAspectRatio(source: JsonRecord, parsed: JsonRecord, fallback: PetAspectRatio): PetAspectRatio {
  const value = firstText(source.aspectRatio, source.ratio, parsed.aspectRatio, parsed.ratio)
  return ['9:16', '16:9', '1:1'].includes(value) ? value as PetAspectRatio : fallback
}

function resolveStyle(source: JsonRecord, parsed: JsonRecord, fallback: PetCreationStyle): PetCreationStyle {
  const value = firstText(source.style, parsed.style)
  return ['realistic', 'cute', 'anime', 'anthropomorphic', 'funny', 'healing'].includes(value)
    ? value as PetCreationStyle
    : fallback
}

function buildPrompt(title: string, source: JsonRecord, parsed: JsonRecord, sourceUrl?: string) {
  return [
    title,
    firstText(source.prompt, source.summary, source.description, parsed.prompt, parsed.summary, parsed.description),
    sourceUrl ? `对标来源：${sourceUrl}` : '',
  ].filter(Boolean).join('。').slice(0, 500)
}

function buildScriptText(
  source: JsonRecord,
  parsed: JsonRecord,
  roles: PetRole[],
  dialogueLines: PetDialogueLine[],
  shots: PetStoryboardShot[],
) {
  const declared = firstText(source.scriptText, source.script, source.copywriting, parsed.scriptText, parsed.script, parsed.copywriting)
  if (declared) return declared
  if (dialogueLines.length) {
    return dialogueLines.map((line, index) => {
      const role = roles.find((item) => item.id === line.speakerRoleId)
      return `${String(index + 1).padStart(2, '0')} ${role?.name || '宠物'}：${line.text}`
    }).join('\n')
  }
  return shots.map((shot) => `${String(shot.index).padStart(2, '0')} ${shot.subtitle || shot.frameDescription}`).join('\n')
}

function resolveMaterialPlan(source: JsonRecord, parsed: JsonRecord, roles: PetRole[], draft: PetCreationDraft) {
  const rawHints = asRecord(source.materialHints) || asRecord(parsed.materialHints) || {}
  const materialKeywords: Partial<Record<ImportMaterialRole, string>> = {}
  const requiredMaterialRoles: ImportMaterialRole[] = ['main_pet']
  const petRoles = roles.filter((role) => role.type === 'cat' || role.type === 'dog')
  const humanRoles = roles.filter((role) => role.type === 'other' && /主人|人物|妈妈|爸爸|姐姐|哥哥|林然|owner|human/i.test(role.name))
  materialKeywords.main_pet = hintKeyword(rawHints.main_pet) || roleKeyword(petRoles[0] || roles[0])
  if (petRoles.length > 1 || hintKeyword(rawHints.second_pet)) {
    requiredMaterialRoles.push('second_pet')
    materialKeywords.second_pet = hintKeyword(rawHints.second_pet) || roleKeyword(petRoles[1] || roles[1])
  }
  if (humanRoles.length || hintKeyword(rawHints.human_avatar)) {
    requiredMaterialRoles.push('human_avatar')
    materialKeywords.human_avatar = hintKeyword(rawHints.human_avatar) || humanRoles[0]?.name || '人物'
  }
  const sceneKeyword = hintKeyword(rawHints.scene) || firstText(draft.visualSettings.backgroundPrompt)
  if (sceneKeyword || /客厅|卧室|厨房|公园|草地|户外|家里|宠物店/.test(draft.prompt)) {
    requiredMaterialRoles.push('scene')
    materialKeywords.scene = sceneKeyword || inferSceneKeyword(draft.prompt)
  }
  if (hintKeyword(rawHints.prop)) {
    requiredMaterialRoles.push('prop')
    materialKeywords.prop = hintKeyword(rawHints.prop)
  }
  return { requiredMaterialRoles: [...new Set(requiredMaterialRoles)], materialKeywords }
}

function hintKeyword(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const record = asRecord(value)
  return record ? firstText(record.keyword, record.keywords, record.label, record.type, record.assetId) : ''
}

function roleKeyword(role?: PetRole) {
  if (!role) return ''
  return [role.type, role.breed, role.name, ...role.personalityTags].filter(Boolean).join(' ')
}

function inferSceneKeyword(value: string) {
  if (/客厅|沙发|家里/.test(value)) return '客厅 living room'
  if (/公园|草地|户外/.test(value)) return '公园 草地 park'
  if (/厨房/.test(value)) return '厨房 kitchen'
  if (/卧室/.test(value)) return '卧室 bedroom'
  return '宠物场景'
}

function readSubtitleStyle(value: unknown): Partial<PetCreationDraft['subtitleStyle']> {
  const record = asRecord(value)
  if (!record) return {}
  const position = firstText(record.position)
  const strokeMode = firstText(record.strokeMode)
  return {
    ...(position === 'bottom' || position === 'middle' || position === 'top' ? { position } : {}),
    ...(typeof record.highlighted === 'boolean' ? { highlighted: record.highlighted } : {}),
    ...(firstText(record.fontFamily) ? { fontFamily: firstText(record.fontFamily) } : {}),
    ...(positiveNumber(record.fontSize, 0) ? { fontSize: positiveNumber(record.fontSize, 34) } : {}),
    ...(firstText(record.textColor) ? { textColor: firstText(record.textColor) } : {}),
    ...(firstText(record.outlineColor) ? { outlineColor: firstText(record.outlineColor) } : {}),
    ...(['none', 'thin', 'strong'].includes(strokeMode) ? { strokeMode: strokeMode as PetTextStrokeMode } : {}),
  }
}

function readVisualSettings(value: unknown): Partial<PetCreationDraft['visualSettings']> {
  const record = asRecord(value)
  if (!record) return {}
  const expressionIntensity = positiveNumber(record.expressionIntensity, 0)
  const cameraRhythm = firstText(record.cameraRhythm)
  return {
    ...(expressionIntensity ? { expressionIntensity: Math.min(100, expressionIntensity) } : {}),
    ...(['slow', 'balanced', 'fast', 'short_drama'].includes(cameraRhythm) ? { cameraRhythm: cameraRhythm as PetCreationDraft['visualSettings']['cameraRhythm'] } : {}),
    ...(firstText(record.backgroundPrompt) ? { backgroundPrompt: firstText(record.backgroundPrompt) } : {}),
    ...(firstText(record.productPrompt) ? { productPrompt: firstText(record.productPrompt) } : {}),
    ...(firstText(record.stylePrompt) ? { stylePrompt: firstText(record.stylePrompt) } : {}),
  }
}

function readBooleanRecord(value: unknown): Partial<PetCreationDraft['consistency']> {
  const record = asRecord(value)
  if (!record) return {}
  const result: Partial<PetCreationDraft['consistency']> = {}
  for (const key of ['keepAppearance', 'keepFurPattern', 'keepScene', 'allowAnthropomorphic', 'multiShotPriority'] as const) {
    if (typeof record[key] === 'boolean') result[key] = record[key]
  }
  return result
}

function inferRoleType(declared: string, searchable: string): PetRole['type'] {
  const text = `${declared} ${searchable}`.toLowerCase()
  if (/cat|kitten|猫|英短|美短|布偶/.test(text)) return 'cat'
  if (/dog|puppy|犬|狗|柯基|金毛|柴犬/.test(text)) return 'dog'
  return 'other'
}

function defaultVoiceName(type: PetRole['type'], index: number) {
  if (type === 'cat') return index % 2 === 0 ? '软萌童声' : '清亮女声'
  if (type === 'dog') return index % 2 === 0 ? '活泼男声' : '机智少年音'
  return index % 2 === 0 ? '温柔女声' : '沉稳男声'
}

function normalizeEmotion(value: string): PetDialogueEmotion {
  if (/委屈/.test(value)) return '委屈'
  if (/吐槽|冷静|无奈/.test(value)) return '吐槽'
  if (/解释|认真/.test(value)) return '认真解释'
  if (/撒娇|卖萌/.test(value)) return '撒娇'
  if (/惊|震惊|慌/.test(value)) return '惊讶'
  return '开心'
}

function inferEmotion(value: string) {
  if (/反转|突然|发现|震惊/.test(value)) return '惊讶'
  if (/吐槽|冷静|无奈/.test(value)) return '吐槽'
  if (/撒娇|卖萌|求/.test(value)) return '撒娇'
  if (/解释|证据|原因/.test(value)) return '认真解释'
  return '开心'
}

function normalizeSpeed(value: string): PetDialogueLine['speed'] {
  if (value === 'slow' || /慢/.test(value)) return 'slow'
  if (value === 'fast' || /快/.test(value)) return 'fast'
  return 'normal'
}

function cleanDialogueText(value: string) {
  return String(value || '').trim().replace(/^[^：:]{1,16}[：:]\s*/, '').replace(/^[“"]|[”"]$/g, '')
}

function readableNameFromFile(value?: string) {
  return String(value || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : null
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const joined = value.map((item) => String(item || '').trim()).filter(Boolean).join(' ')
      if (joined) return joined
      continue
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text && text !== 'undefined' && text !== 'null') return text
    }
  }
  return ''
}

function stringArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value.map((item) => firstText(item)).filter(Boolean)
    if (typeof value === 'string' && value.trim()) return value.split(/[,，、|]/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function positiveNumber(...values: unknown[]) {
  const fallback = Number(values[values.length - 1]) || 0
  for (const value of values.slice(0, -1)) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return Math.round(number)
  }
  return fallback
}

function booleanValue(...values: unknown[]) {
  const fallback = Boolean(values[values.length - 1])
  for (const value of values.slice(0, -1)) {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}
