import { request } from './request'
import type { AssetItem } from '../types/assetTypes'

export type PetImageAssetKind = 'pet' | 'background'

export interface PetImageGenerateRequest {
  name?: string
  prompt: string
  kind: PetImageAssetKind
  style?: string
  imageCount?: number
  size?: string
  referenceAssetIds?: number[]
}

export interface PetImageGenerateResponse {
  assetIds: number[]
  previewUrls: string[]
  remoteImageUrls: string[]
  assets: AssetItem[]
}

export function generatePetImageAsset(payload: PetImageGenerateRequest) {
  return request<PetImageGenerateResponse>('/pet-assets/images/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 240000,
  })
}
