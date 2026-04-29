import { request } from './request'
import type { AssetItem, AssetType } from '../types/assetTypes'

export function getProjectAssets(projectId: number, assetType?: AssetType) {
  const params = new URLSearchParams({ projectId: String(projectId) })
  if (assetType) {
    params.set('assetType', assetType)
  }
  return request<AssetItem[]>(`/assets?${params.toString()}`)
}

export function getAssetDetail(assetId: number) {
  return request<AssetItem>(`/assets/${assetId}`)
}
