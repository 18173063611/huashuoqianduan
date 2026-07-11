import type { AssetItem } from './assetTypes'

export interface AvatarItem {
  avatarId: number
  projectId: number | null
  taskId: number | null
  assetId: number | null
  ownerUserId?: number | null
  createdByUserId?: number | null
  visibility?: string | null
  status?: string | null
  manageable?: boolean
  avatarName: string
  sourceType: 'USER_UPLOAD' | 'AI_GENERATED' | string
  prompt: string | null
  referenceAssetIds: string | null
  previewUrl: string | null
  metadataJson: string | null
  defaultAvatar: boolean
  createdAt: string
  updatedAt: string
}

export interface AvatarGenerateRequest {
  projectId?: number | null
  avatarName: string
  prompt: string
  referenceAssetIds: number[]
  style: 'REALISTIC' | 'COMMERCIAL' | 'PROFESSIONAL' | string
  framing?: 'FULL_BODY' | string
  outfitPreset?: string
  outfitDescription?: string
  heightCm: number
  weightKg: number
  imageCount: number
  size: string
  businessDomain?: 'pet'
}

export interface AvatarGenerateResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
}

export interface AvatarTaskDetailResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
  progress: number | null
  errorMessage: string | null
  imageAssets: AssetItem[]
  avatars: AvatarItem[]
}

export interface AvatarGenerateTaskResult {
  assetIds: number[]
  avatarIds: number[]
  previewUrls: string[]
  remoteImageUrls?: string[]
  heightCm?: number | null
  weightKg?: number | null
  bodyShapeLabel?: string | null
}

export interface AvatarUpdateRequest {
  avatarName?: string
  defaultAvatar?: boolean
}
