export type AssetType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'COVER' | 'JSON'

export interface AssetItem {
  assetId: number
  projectId: number | null
  taskId: number | null
  assetType: AssetType
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
