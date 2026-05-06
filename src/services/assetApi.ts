import { request } from './request'
import type { AssetItem, AssetType } from '../types/assetTypes'

export function getAssets(assetType?: AssetType) {
  const params = new URLSearchParams()
  if (assetType) {
    params.set('assetType', assetType)
  }
  const query = params.toString()
  return request<AssetItem[]>(query ? `/assets?${query}` : '/assets')
}

export function getAssetDetail(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}`)
}

export function saveAsset(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}/save`, {
    method: 'POST',
  })
}
