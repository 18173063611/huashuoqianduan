import type { AssetItem } from './assetTypes'

export interface AvatarItem {
  avatarId: number
  projectId: number | null
  taskId: number | null
  assetId: number | null
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
  imageCount: number
  size: string
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

export interface AvatarUpdateRequest {
  avatarName?: string
  defaultAvatar?: boolean
}
