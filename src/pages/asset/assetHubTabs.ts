export const ASSET_HUB_TAB_STORAGE_KEY = 'huashuo_asset_hub_tab_v1'

export type AssetHubTabKey = 'materials' | 'voices' | 'credits' | 'tasks'

export const ASSET_HUB_TAB_ORDER: AssetHubTabKey[] = ['materials', 'voices', 'credits', 'tasks']

export const ASSET_HUB_TAB_LABEL: Record<AssetHubTabKey, string> = {
  materials: '素材资产',
  voices: '音色库',
  credits: '积分明细',
  tasks: '最近任务',
}

export function parseAssetHubTab(raw: unknown): AssetHubTabKey | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  if (typeof s !== 'string') return null
  return ASSET_HUB_TAB_ORDER.includes(s as AssetHubTabKey) ? (s as AssetHubTabKey) : null
}

export function readStoredAssetHubTab(): AssetHubTabKey | null {
  try {
    const v = localStorage.getItem(ASSET_HUB_TAB_STORAGE_KEY)
    return parseAssetHubTab(v)
  } catch {
    return null
  }
}

export function writeStoredAssetHubTab(tab: AssetHubTabKey) {
  try {
    localStorage.setItem(ASSET_HUB_TAB_STORAGE_KEY, tab)
  } catch {
    /* ignore */
  }
}
