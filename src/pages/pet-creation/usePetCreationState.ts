import { computed, reactive } from 'vue'
import { defaultPetDraft } from './petCreationMock'
import { findPetTemplate } from './petTemplateConfig'
import { getPetDraft, savePetDraft } from '../../services/petCreationApi'
import type { PetCreationDraft, PetTemplate } from './petCreationTypes'

function cloneDraft(draft: PetCreationDraft): PetCreationDraft {
  return JSON.parse(JSON.stringify(draft)) as PetCreationDraft
}

function cloneTemplateValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultPetVoiceName(type: PetCreationDraft['roles'][number]['type'], index: number) {
  if (type === 'dog') return index % 2 === 0 ? '活泼男声' : '机智少年音'
  if (type === 'cat') return index % 2 === 0 ? '软萌童声' : '奶萌童声'
  return index % 2 === 0 ? '清亮女声' : '默认萌宠音'
}

function ensurePetVoiceNames<T extends PetCreationDraft>(payload: T): T {
  payload.roles.forEach((role, index) => {
    if (!role.voiceName) role.voiceName = defaultPetVoiceName(role.type, index)
  })
  payload.dialogueLines.forEach((line) => {
    if (line.voiceName) return
    const roleIndex = payload.roles.findIndex((role) => role.id === line.speakerRoleId)
    const role = payload.roles[roleIndex]
    line.voiceName = role?.voiceName || defaultPetVoiceName(role?.type || 'other', Math.max(roleIndex, 0))
  })
  return payload
}

export function usePetCreationState(initialDraft: PetCreationDraft = defaultPetDraft) {
  const draft = reactive<PetCreationDraft>(ensurePetVoiceNames(cloneDraft(initialDraft)))
  const selectedTemplate = computed(() => findPetTemplate(draft.templateId))

  async function loadDraft() {
    Object.assign(draft, ensurePetVoiceNames(await getPetDraft()))
  }

  function snapshotDraft() {
    return ensurePetVoiceNames(cloneDraft(draft))
  }

  async function saveDraft() {
    const nextDraft = await savePetDraft(snapshotDraft())
    Object.assign(draft, nextDraft)
    return nextDraft
  }

  function applyTemplate(template: PetTemplate) {
    draft.templateId = template.id
    draft.videoType = template.videoType
    if (template.generationMode) {
      draft.generationMode = template.generationMode
    }
    draft.durationSeconds = template.durationSeconds
    draft.aspectRatio = template.aspectRatio
    draft.style = template.style
    if (template.promptPreset) {
      draft.prompt = template.promptPreset
    }
    if (template.scriptPreset !== undefined) {
      draft.scriptText = template.scriptPreset
    }
    if (template.dialogueLines) {
      draft.dialogueLines = cloneTemplateValue(template.dialogueLines)
    }
    if (template.shots) {
      draft.shots = cloneTemplateValue(template.shots)
    }
    if (typeof template.subtitleEnabled === 'boolean') {
      draft.subtitleEnabled = template.subtitleEnabled
    }
    if (typeof template.voiceEnabled === 'boolean') {
      draft.voiceEnabled = template.voiceEnabled
    }
    if (typeof template.lipSyncEnabled === 'boolean') {
      draft.lipSyncEnabled = template.lipSyncEnabled
    }
    if (typeof template.bgmEnabled === 'boolean') {
      draft.bgmEnabled = template.bgmEnabled
    }
    if (template.visualSettings) {
      Object.assign(draft.visualSettings, cloneTemplateValue(template.visualSettings))
    }
    if (template.consistency) {
      Object.assign(draft.consistency, cloneTemplateValue(template.consistency))
    }
    ensurePetVoiceNames(draft)
  }

  function resetDraft() {
    Object.assign(draft, ensurePetVoiceNames(cloneDraft(defaultPetDraft)))
  }

  return {
    draft,
    selectedTemplate,
    loadDraft,
    saveDraft,
    snapshotDraft,
    applyTemplate,
    resetDraft,
  }
}
