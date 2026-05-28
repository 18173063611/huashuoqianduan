import { API_BASE_URL, API_ORIGIN, getAuthToken, request } from './request'
import type { AssetItem, AssetType } from '../types/assetTypes'

export type AssetListSort = 'createdAtDesc' | 'createdAtAsc' | 'fileNameAsc' | 'fileSizeDesc'

export type AssetListScope = 'global' | 'private' | 'all'

export interface ListAssetsParams {
  /** global=仅公共；private=仅当前用户；省略或 all=未登录仅公共，已登录公共+本人 */
  scope?: AssetListScope
  assetType?: AssetType
  keyword?: string
  sourceType?: string
  sort?: AssetListSort
}

export interface UploadMaterialAssetOptions {
  projectId?: number | null
  publish?: boolean
  metadataJson?: string
}

export async function getAssets(params?: ListAssetsParams) {
  const search = new URLSearchParams()
  if (params?.assetType) {
    search.set('assetType', params.assetType)
  }
  if (params?.keyword && params.keyword.trim()) {
    search.set('keyword', params.keyword.trim())
  }
  if (params?.sourceType && params.sourceType.trim()) {
    search.set('sourceType', params.sourceType.trim())
  }
  if (params?.sort) {
    search.set('sort', params.sort)
  }
  if (params?.scope && params.scope !== 'all') {
    search.set('scope', params.scope)
  }
  const query = search.toString()
  const data = await request<AssetItem[] | AssetItem | null | undefined>(
    query ? `/assets?${query}` : '/assets',
  )
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object' && 'assetId' in data) {
    return [data as AssetItem]
  }
  return []
}

export function getAssetDetail(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}`)
}

export function uploadMaterialAsset(file: File, options?: UploadMaterialAssetOptions) {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.projectId != null) {
    formData.append('projectId', String(options.projectId))
  }
  if (options?.publish) {
    formData.append('publish', 'true')
  }
  if (options?.metadataJson && options.metadataJson.trim()) {
    formData.append('metadataJson', options.metadataJson.trim())
  }
  return request<AssetItem>('/assets/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function getAssetTextContent(asset: AssetItem) {
  const token = getAuthToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const primaryUrl = `${API_BASE_URL}/assets/${asset.assetId}/content`

  const primary = await fetch(primaryUrl, { headers })
  if (primary.ok) {
    return primary.text()
  }

  const fileUrl = asset.fileUrl || ''
  const fallbackUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${API_ORIGIN}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
  if (!fallbackUrl || fallbackUrl === primaryUrl) {
    const text = await primary.text().catch(() => '')
    throw new Error(`HTTP ${primary.status}: ${text}`)
  }

  const fallback = await fetch(fallbackUrl, { headers })
  const text = await fallback.text()
  if (!fallback.ok) {
    throw new Error(`HTTP ${fallback.status}: ${text}`)
  }
  return text
}

export function saveAsset(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}/save`, {
    method: 'POST',
  })
}

export function publishAsset(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}/publish`, {
    method: 'POST',
  })
}

export function unpublishAsset(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}/unpublish`, {
    method: 'POST',
  })
}

export function deleteAsset(assetId: number) {
  return request<void>(`/assets/${assetId}`, {
    method: 'DELETE',
  })
}
