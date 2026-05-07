import { request } from './request'
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

export function saveAsset(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}/save`, {
    method: 'POST',
  })
}

export function deleteAsset(assetId: number) {
  return request<void>(`/assets/${assetId}`, {
    method: 'DELETE',
  })
}
