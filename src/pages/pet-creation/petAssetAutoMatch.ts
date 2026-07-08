import { getAssets } from '../../services/assetApi'
import type { AssetItem } from '../../types/assetTypes'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import type { PetCreationDraft, PetReferenceMaterial, PetTemplate } from './petCreationTypes'

type MatchRole = Extract<PetReferenceMaterial['role'], 'main_pet' | 'second_pet' | 'prop' | 'scene'>

const GROUP_BY_ROLE: Record<MatchRole, string> = {
  main_pet: '主宠物候选',
  second_pet: '第二宠物候选',
  prop: '宠物产品/道具',
  scene: '场景参考',
}

const LABEL_BY_ROLE: Record<MatchRole, string> = {
  main_pet: '主宠物参考',
  second_pet: '更多宠物参考',
  prop: '产品/道具参考',
  scene: '背景/场景参考',
}

function hasRoleMaterial(draft: PetCreationDraft, role: PetReferenceMaterial['role']) {
  return draft.materials.some((material) => material.role === role && (material.assetId || material.url))
}

function hasAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword))
}

function keywordForRole(role: MatchRole, prompt: string) {
  const value = prompt.toLowerCase()
  if (role === 'main_pet' || role === 'second_pet') {
    if (hasAnyKeyword(value, ['狗', '小狗', 'dog', 'puppy', '柯基', '金毛'])) return 'dog'
    if (hasAnyKeyword(value, ['猫', '小猫', 'cat', 'kitten', '英短'])) return 'cat'
    return ''
  }
  if (role === 'scene') {
    if (hasAnyKeyword(value, ['草地', '公园', '户外', '花园', 'park', 'garden'])) return 'park'
    if (hasAnyKeyword(value, ['厨房', 'kitchen'])) return 'kitchen'
    if (hasAnyKeyword(value, ['客厅', '沙发', '室内', 'home', 'room'])) return 'living'
    return ''
  }
  if (role === 'prop') {
    if (hasAnyKeyword(value, ['零食', '粮', '罐头', 'food', 'snack'])) return 'food'
    if (hasAnyKeyword(value, ['玩具', '球', 'toy'])) return 'toy'
    return ''
  }
  return ''
}

function shouldNeedSecondPet(template: PetTemplate, draft: PetCreationDraft) {
  return template.workflow === 'dialogue' || draft.roles.length > 1 || hasAnyKeyword(draft.prompt, ['多宠物', '多只', '两只', '双宠', '对话'])
}

function shouldNeedScene(template: PetTemplate, prompt: string) {
  return template.workflow === 'background' || hasAnyKeyword(prompt, ['背景', '场景', '客厅', '草地', '公园', '厨房', '宠物店', '咖啡店'])
}

function shouldNeedProp(template: PetTemplate, prompt: string) {
  return template.id === 'pet-talking' || hasAnyKeyword(prompt, ['产品', '用品', '零食', '玩具', '道具', '种草'])
}

function assetToMaterial(asset: AssetItem, role: MatchRole): PetReferenceMaterial {
  return {
    id: `asset-${asset.assetId}-${role}`,
    role,
    assetId: String(asset.assetId),
    url: normalizePublicMediaUrl(asset.fileUrl || asset.thumbnailUrl || ''),
    label: asset.fileName || LABEL_BY_ROLE[role],
  }
}

async function loadBestAsset(role: MatchRole, prompt: string) {
  const keyword = keywordForRole(role, prompt)
  const baseParams = {
    assetType: 'IMAGE' as const,
    businessDomain: 'pet' as const,
    assetGroup: GROUP_BY_ROLE[role],
    scope: 'all' as const,
    pageNo: 1,
    pageSize: 12,
  }
  const firstList = await getAssets(keyword ? { ...baseParams, keyword } : baseParams)
  const assets = firstList.length > 0 || !keyword ? firstList : await getAssets(baseParams)
  return assets.find((asset) => asset.assetId && (asset.fileUrl || asset.thumbnailUrl)) || assets[0] || null
}

export function syncPetRoleReferenceAssets(draft: PetCreationDraft) {
  const assetIdsByRole = (role: PetReferenceMaterial['role']) =>
    draft.materials
      .filter((material) => material.role === role && material.assetId)
      .map((material) => String(material.assetId))

  if (draft.roles[0]) draft.roles[0].referenceAssetIds = assetIdsByRole('main_pet')
  draft.roles.slice(1).forEach((role) => {
    role.referenceAssetIds = assetIdsByRole('second_pet')
  })
}

export async function autoMatchPetMaterials(draft: PetCreationDraft, template: PetTemplate) {
  const roles: MatchRole[] = []
  if (draft.generationMode !== 'text_video' && !hasRoleMaterial(draft, 'main_pet')) roles.push('main_pet')
  if (shouldNeedSecondPet(template, draft) && !hasRoleMaterial(draft, 'second_pet')) roles.push('second_pet')
  if (shouldNeedScene(template, draft.prompt) && !hasRoleMaterial(draft, 'scene')) roles.push('scene')
  if (shouldNeedProp(template, draft.prompt) && !hasRoleMaterial(draft, 'prop')) roles.push('prop')

  let matchedCount = 0
  for (const role of roles) {
    let asset: AssetItem | null = null
    try {
      asset = await loadBestAsset(role, draft.prompt)
    } catch (error) {
      console.warn('[petAssetAutoMatch] skip auto material match.', role, error)
      continue
    }
    if (!asset) continue
    draft.materials.push(assetToMaterial(asset, role))
    matchedCount += 1
  }
  syncPetRoleReferenceAssets(draft)
  return matchedCount
}
