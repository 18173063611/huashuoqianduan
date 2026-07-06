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

export function usePetCreationState(initialDraft: PetCreationDraft = defaultPetDraft) {
  const draft = reactive<PetCreationDraft>(cloneDraft(initialDraft))
  const selectedTemplate = computed(() => findPetTemplate(draft.templateId))

  async function loadDraft() {
    Object.assign(draft, await getPetDraft())
  }

  function snapshotDraft() {
    return cloneDraft(draft)
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
  }

  function resetDraft() {
    Object.assign(draft, cloneDraft(defaultPetDraft))
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
