export type AssetType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'COVER' | 'JSON'

export interface AssetItem {
  assetId: number
  ownerUserId: number | null
  createdByUserId?: number | null
  projectId: number | null
  taskId: number | null
  assetType: AssetType
  kind?: string | null
  visibility?: string | null
  status?: string | null
  publishedAt?: string | null
  fileName: string
  filePath: string | null
  fileUrl: string
  thumbnailUrl: string | null
  mimeType: string | null
  fileSize: number
  sourceType: string
  metadataJson: string | null
  createdAt: string
  updatedAt: string
}
