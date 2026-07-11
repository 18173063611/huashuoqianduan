import { getAssets } from '../../services/assetApi'
import { getAvatars } from '../../services/avatarApi'
import type { AssetItem } from '../../types/assetTypes'
import type { AvatarItem } from '../../types/avatarTypes'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import type { PetCreationDraft, PetReferenceMaterial, PetTemplate } from './petCreationTypes'
import { petAssetDisplayName } from './petAssetDisplayName'

export type PetAutoMatchRole = Extract<PetReferenceMaterial['role'], 'main_pet' | 'second_pet' | 'human_avatar' | 'prop' | 'scene'>

export interface PetAutoMatchOptions {
  requiredRoles?: PetAutoMatchRole[]
  replaceRoles?: PetAutoMatchRole[]
  roleKeywords?: Partial<Record<PetAutoMatchRole, string>>
}

const GROUPS_BY_ROLE: Record<PetAutoMatchRole, string[]> = {
  main_pet: ['主宠物候选'],
  second_pet: ['第二宠物候选', '主宠物候选'],
  human_avatar: ['宠物数字人形象'],
  prop: ['宠物产品/道具'],
  scene: ['宠物背景图', '场景参考', '宠物背景/场景'],
}

const LABEL_BY_ROLE: Record<PetAutoMatchRole, string> = {
  main_pet: '主宠物参考',
  second_pet: '更多宠物参考',
  human_avatar: '人物/主人参考',
  prop: '产品/道具参考',
  scene: '背景/场景参考',
}

function hasRoleMaterial(draft: PetCreationDraft, role: PetReferenceMaterial['role']) {
  return draft.materials.some((material) => material.role === role && (material.assetId || material.url))
}

function hasAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword))
}

function keywordForRole(role: PetAutoMatchRole, prompt: string) {
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
  const prompt = draft.prompt.toLowerCase()
  const mentionsCatAndDog = hasAnyKeyword(prompt, ['猫', 'cat', 'kitten']) && hasAnyKeyword(prompt, ['狗', 'dog', 'puppy'])
  const explicitlyMultiPet = mentionsCatAndDog || hasAnyKeyword(prompt, ['多宠物', '多只', '两只', '双宠', '对话', '吵架', '争夺'])
  const humanIntent = hasAnyKeyword(prompt, ['人宠', '主人', '人物', '回家', '陪伴', '同框'])
  return explicitlyMultiPet || (template.workflow === 'dialogue' && !humanIntent)
}

function shouldNeedHuman(template: PetTemplate, prompt: string) {
  return template.id === 'dog-reaction' || hasAnyKeyword(prompt, ['人宠', '主人', '人物', '回家', '陪伴', '同框'])
}

function shouldNeedScene(template: PetTemplate, prompt: string) {
  return template.workflow === 'background' || hasAnyKeyword(prompt, ['背景', '场景', '客厅', '草地', '公园', '厨房', '宠物店', '咖啡店'])
}

function shouldNeedProp(template: PetTemplate, prompt: string) {
  return template.id === 'pet-talking' || hasAnyKeyword(prompt, ['产品', '用品', '零食', '玩具', '道具', '种草'])
}

function assetToMaterial(asset: AssetItem, role: PetAutoMatchRole): PetReferenceMaterial {
  return {
    id: `asset-${asset.assetId}-${role}`,
    role,
    assetId: String(asset.assetId),
    url: normalizePublicMediaUrl(asset.fileUrl || asset.thumbnailUrl || ''),
    label: matchedMaterialLabel(asset, role),
  }
}

function matchedMaterialLabel(asset: AssetItem, role: PetAutoMatchRole) {
  const label = petAssetDisplayName(asset) || LABEL_BY_ROLE[role]
  if (role === 'main_pet') return label.replace(/^第二宠物参考图/, '主宠物参考图')
  if (role === 'second_pet') return label.replace(/^(主宠物参考图|宠物图片)/, '第二宠物参考图')
  if (role === 'scene') return label.replace(/^宠物图片/, '宠物场景')
  if (role === 'prop') return label.replace(/^宠物图片/, '宠物道具')
  return label
}

function avatarToMaterial(avatar: AvatarItem): PetReferenceMaterial {
  return {
    id: `avatar-${avatar.avatarId}-human_avatar`,
    role: 'human_avatar',
    assetId: avatar.assetId != null ? String(avatar.assetId) : undefined,
    url: normalizePublicMediaUrl(avatar.previewUrl || ''),
    label: avatar.avatarName || `宠物主人形象-${avatar.avatarId}`,
  }
}

async function loadBestAvatar(keyword: string, excludedAssetIds: Set<number>) {
  const avatars = await getAvatars({ businessDomain: 'pet' })
  const tokens = keyword.toLowerCase().split(/[\s,，、|/]+/).filter(Boolean)
  const candidates = avatars.filter((avatar) => {
    if (!avatar.previewUrl) return false
    if (avatar.assetId != null && excludedAssetIds.has(avatar.assetId)) return false
    return true
  })
  return candidates.find((avatar) => {
    if (!tokens.length) return false
    const searchable = `${avatar.avatarName} ${avatar.prompt || ''} ${avatar.metadataJson || ''}`.toLowerCase()
    return tokens.some((token) => searchable.includes(token))
  }) || candidates.find((avatar) => avatar.defaultAvatar) || candidates[0] || null
}

async function loadBestAsset(
  role: PetAutoMatchRole,
  prompt: string,
  excludedAssetIds: Set<number>,
  explicitKeyword = '',
) {
  const fallbackKeyword = keywordForRole(role, prompt)
  const keywordCandidates = [...new Set([
    explicitKeyword.trim(),
    ...explicitKeyword.split(/[\s,，、|/]+/).map((item) => item.trim()),
    fallbackKeyword,
  ].filter(Boolean))]
  const baseParams = {
    assetType: 'IMAGE' as const,
    businessDomain: 'pet' as const,
    scope: 'all' as const,
    pageNo: 1,
    pageSize: 12,
  }
  const groupFallbacks: AssetItem[] = []
  for (const assetGroup of GROUPS_BY_ROLE[role]) {
    const groupParams = { ...baseParams, assetGroup }
    for (const keyword of keywordCandidates) {
      const assets = await getAssets({ ...groupParams, keyword })
      const matched = assets.find((asset) => asset.assetId && !excludedAssetIds.has(asset.assetId) && (asset.fileUrl || asset.thumbnailUrl))
      if (matched) return matched
    }
    const fallbackAssets = await getAssets(groupParams)
    const fallback = fallbackAssets.find((asset) => asset.assetId && !excludedAssetIds.has(asset.assetId) && (asset.fileUrl || asset.thumbnailUrl))
    if (fallback) groupFallbacks.push(fallback)
  }
  return groupFallbacks[0] || null
}

export function syncPetRoleReferenceAssets(draft: PetCreationDraft) {
  const assetIdsByRole = (role: PetReferenceMaterial['role']) =>
    draft.materials
      .filter((material) => material.role === role && material.assetId)
      .map((material) => String(material.assetId))

  let petRoleIndex = 0
  draft.roles.forEach((role) => {
    if (role.type === 'cat' || role.type === 'dog') {
      role.referenceAssetIds = assetIdsByRole(petRoleIndex === 0 ? 'main_pet' : 'second_pet')
      petRoleIndex += 1
      return
    }
    role.referenceAssetIds = assetIdsByRole('human_avatar')
  })
}

export async function autoMatchPetMaterials(
  draft: PetCreationDraft,
  template: PetTemplate,
  options: PetAutoMatchOptions = {},
) {
  const replaceRoles = new Set(options.replaceRoles || [])
  if (replaceRoles.size) {
    draft.materials = draft.materials.filter((material) => !replaceRoles.has(material.role as PetAutoMatchRole))
  }

  const roles: PetAutoMatchRole[] = []
  if (options.requiredRoles?.length) {
    options.requiredRoles.forEach((role) => {
      if (!hasRoleMaterial(draft, role) && !roles.includes(role)) roles.push(role)
    })
  } else {
    if (draft.generationMode !== 'text_video' && !hasRoleMaterial(draft, 'main_pet')) roles.push('main_pet')
    if (shouldNeedSecondPet(template, draft) && !hasRoleMaterial(draft, 'second_pet')) roles.push('second_pet')
    if (shouldNeedHuman(template, draft.prompt) && !hasRoleMaterial(draft, 'human_avatar')) roles.push('human_avatar')
    if (shouldNeedScene(template, draft.prompt) && !hasRoleMaterial(draft, 'scene')) roles.push('scene')
    if (shouldNeedProp(template, draft.prompt) && !hasRoleMaterial(draft, 'prop')) roles.push('prop')
  }

  let matchedCount = 0
  const selectedAssetIds = new Set(
    draft.materials.map((material) => Number(material.assetId)).filter((assetId) => Number.isFinite(assetId) && assetId > 0),
  )
  for (const role of roles) {
    if (role === 'human_avatar') {
      try {
        const avatar = await loadBestAvatar(options.roleKeywords?.human_avatar || draft.prompt, selectedAssetIds)
        if (avatar) {
          draft.materials.push(avatarToMaterial(avatar))
          if (avatar.assetId != null) selectedAssetIds.add(avatar.assetId)
          matchedCount += 1
          continue
        }
      } catch (error) {
        console.warn('[petAssetAutoMatch] skip preferred avatar match.', error)
      }
    }
    let asset: AssetItem | null = null
    try {
      asset = await loadBestAsset(role, draft.prompt, selectedAssetIds, options.roleKeywords?.[role])
    } catch (error) {
      console.warn('[petAssetAutoMatch] skip auto material match.', role, error)
      if (role !== 'human_avatar') continue
    }
    if (asset) {
      draft.materials.push(assetToMaterial(asset, role))
      selectedAssetIds.add(asset.assetId)
      matchedCount += 1
      continue
    }
  }
  syncPetRoleReferenceAssets(draft)
  return matchedCount
}
