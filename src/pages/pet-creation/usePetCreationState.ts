import { computed, reactive } from 'vue'
import { defaultPetDraft } from './petCreationMock'
import { findPetTemplate } from './petTemplateConfig'
import { getPetDraft, savePetDraft } from '../../services/petCreationApi'
import type { PetCreationDraft, PetTemplate } from './petCreationTypes'

function cloneDraft(draft: PetCreationDraft): PetCreationDraft {
  return JSON.parse(JSON.stringify(draft)) as PetCreationDraft
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
    draft.durationSeconds = template.durationSeconds
    draft.aspectRatio = template.aspectRatio
    draft.style = template.style
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
