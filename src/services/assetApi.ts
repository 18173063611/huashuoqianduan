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
  assetGroup?: string
  sort?: AssetListSort
  pageNo?: number
  pageSize?: number
  includePreview?: boolean
}

export interface UploadMaterialAssetOptions {
  projectId?: number | null
  publish?: boolean
  metadataJson?: string
}

const ASSET_CONTENT_TIMEOUT_MS = 8000

async function fetchTextWithTimeout(url: string, init?: RequestInit, timeoutMs = ASSET_CONTENT_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  }
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller?.signal || init?.signal,
    })
    const text = await res.text()
    return { res, text }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`加载资产内容超时（${Math.round(timeoutMs / 1000)}秒）：${url}`)
    }
    throw error
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
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
  if (params?.assetGroup && params.assetGroup.trim()) {
    search.set('assetGroup', params.assetGroup.trim())
  }
  if (params?.sort) {
    search.set('sort', params.sort)
  }
  if (params?.pageNo && Number.isFinite(params.pageNo) && params.pageNo > 0) {
    search.set('pageNo', String(Math.floor(params.pageNo)))
  }
  if (params?.pageSize && Number.isFinite(params.pageSize) && params.pageSize > 0) {
    search.set('pageSize', String(Math.floor(params.pageSize)))
  }
  if (params?.includePreview === false) {
    search.set('includePreview', 'false')
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

  const primary = await fetchTextWithTimeout(primaryUrl, { headers })
  if (primary.res.ok) {
    return primary.text
  }

  const fileUrl = asset.fileUrl || ''
  const fallbackUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${API_ORIGIN}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
  if (!fallbackUrl || fallbackUrl === primaryUrl) {
    throw new Error(`HTTP ${primary.res.status}: ${primary.text}`)
  }

  const fallback = await fetchTextWithTimeout(fallbackUrl, { headers })
  if (!fallback.res.ok) {
    throw new Error(`HTTP ${fallback.res.status}: ${fallback.text}`)
  }
  return fallback.text
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

export function updateAssetGroup(assetId: number, assetGroup: string | null) {
  return request<AssetItem>(`/assets/${assetId}/group`, {
    method: 'PATCH',
    body: JSON.stringify({ assetGroup }),
  })
}

export function updateAssetCover(
  assetId: number,
  payload: { thumbnailUrl: string; metadataJson?: string | null },
) {
  return request<AssetItem>(`/assets/${assetId}/cover`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateCarModelBundleAsset(
  assetId: number,
  payload: { fileName: string; contentJson: string; metadataJson: string },
) {
  return request<AssetItem>(`/assets/${assetId}/car-model-bundle`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateAssetContent(
  assetId: number,
  payload: { fileName: string; content: string; metadataJson?: string | null },
) {
  return request<AssetItem>(`/assets/${assetId}/content`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAsset(assetId: number) {
  return request<void>(`/assets/${assetId}`, {
    method: 'DELETE',
  })
}
