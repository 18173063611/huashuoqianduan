import type { PetCreationDraft, PetReferenceMaterial } from './petCreationTypes'

export type PetStoryMode = 'human-pet' | 'multi-pet'

function hasLocator(material: PetReferenceMaterial) {
  return Boolean(material.assetId?.trim() || material.url?.trim())
}

export function resolvePetStoryMode(draft: Pick<PetCreationDraft, 'materials'>): PetStoryMode {
  return draft.materials.some((material) => material.role === 'human_avatar' && hasLocator(material))
    ? 'human-pet'
    : 'multi-pet'
}

export function syncPetStoryMode(draft: PetCreationDraft) {
  const mode = resolvePetStoryMode(draft)
  const nextVideoType = mode === 'human-pet' ? 'short_drama' : 'dialogue'
  const nextGenerationMode = mode === 'human-pet' ? 'reference_video' : 'dialogue_video'
  const changed = draft.videoType !== nextVideoType || draft.generationMode !== nextGenerationMode

  draft.videoType = nextVideoType
  draft.generationMode = nextGenerationMode
  return { mode, changed }
}
