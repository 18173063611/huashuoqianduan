export interface TemplateAssetRef {
  assetId: number
  role: string
}

export interface TemplateItem {
  templateId: number
  ownerUserId: number | null
  createdByUserId: number | null
  visibility: string
  status: string
  publishedAt: string | null
  versionNo: number
  title: string
  description: string | null
  coverAssetId: number | null
  tags: string | null
  metadataJson: string | null
  assets: TemplateAssetRef[]
  createdAt: string
  updatedAt: string
}

export interface TemplateCreateRequest {
  title: string
  description?: string
  coverAssetId?: number
  tags?: string
  metadataJson?: string
  assets?: Array<{ assetId: number; role?: string }>
}

