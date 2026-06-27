import type { CarSalesAssetRoleBinding } from '../../types/videoTypes'

interface BundleAssetLike {
  assetId: number
  fileName: string
  assetType: string
  fileUrl?: string | null
  thumbnailUrl?: string | null
  metadataJson?: string | null
}

export interface CarModelBundleImageEntry {
  url: string
  role: string
  label: string
  assetId?: number | null
}

const IMAGE_ARRAY_FIELDS = ['previewImages', 'images', 'vehicleImages', 'carImages', 'materials', 'items', 'assets']
const IMAGE_URL_FIELDS = [
  'url',
  'fileUrl',
  'previewUrl',
  'imageUrl',
  'thumbnailUrl',
  'coverUrl',
  'coverImageUrl',
  'firstFrameUrl',
  'posterUrl',
]
const NESTED_OBJECT_FIELDS = ['asset', 'image', 'file', 'material', 'preview', 'source']
const IMAGE_ASSET_TYPES = new Set(['image', 'cover'])
const NON_IMAGE_ASSET_TYPES = new Set([
  'audio',
  'bgm',
  'json',
  'script',
  'script_asset',
  'storyboard',
  'storyboard_asset',
  'text',
  'video',
])
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const NON_IMAGE_EXTENSIONS = ['.aac', '.doc', '.docx', '.json', '.m4a', '.md', '.mp3', '.mp4', '.mov', '.pdf', '.srt', '.txt', '.vtt', '.wav', '.webm']

const ROLE_ALIASES: Record<string, string> = {
  front: 'car_exterior_front',
  exterior_front: 'car_exterior_front',
  car_front: 'car_exterior_front',
  side: 'car_exterior_side',
  exterior_side: 'car_exterior_side',
  rear: 'car_exterior_rear',
  back: 'car_exterior_rear',
  exterior_rear: 'car_exterior_rear',
  '45': 'car_exterior_45',
  '45_degree': 'car_exterior_45',
  car_exterior_45_degree: 'car_exterior_45',
  dashboard: 'car_interior_dashboard',
  interior: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  rear_seat: 'car_interior_back_seat',
  back_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  instrument: 'car_interior_dashboard',
  dashboard_wheel: 'car_interior_dashboard',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  sunroof: 'car_detail_sunroof',
  panoramic_roof: 'car_detail_sunroof',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  logo: 'car_detail_logo',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  dealership: 'scene_showroom',
  scene: 'scene_showroom',
  road: 'scene_road',
  mountain: 'scene_road',
  highway: 'scene_road',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  scene_outdoor_city: 'scene_outdoor',
  night: 'scene_night',
  store_night: 'scene_night',
  host: 'host_image',
  avatar: 'host_image',
}

export function parseCarModelBundleRecord(
  textContent?: string | null,
  metadataJson?: string | null,
): Record<string, unknown> | null {
  return parseJsonObject(textContent) || parseJsonObject(metadataJson)
}

export function extractCarModelBundleImageEntries(
  record: Record<string, unknown> | null | undefined,
): CarModelBundleImageEntry[] {
  if (!record) {
    return []
  }
  const entries: CarModelBundleImageEntry[] = []
  for (const key of IMAGE_ARRAY_FIELDS) {
    const rows = record[key]
    if (!Array.isArray(rows)) {
      continue
    }
    for (const row of rows) {
      const entry = imageEntryFromRow(row)
      if (entry) {
        entries.push(entry)
      }
    }
  }
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = entry.url.trim()
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function carModelBundleImageUrls(
  asset: BundleAssetLike | null | undefined,
  textContent?: string | null,
  resolveUrl?: (url: string) => string,
) {
  const record = parseCarModelBundleRecord(textContent, asset?.metadataJson)
  return extractCarModelBundleImageEntries(record)
    .map((entry) => normalizeOutputUrl(entry.url, resolveUrl))
    .filter(Boolean)
}

export function carModelBundleCoverUrl(
  asset: BundleAssetLike | null | undefined,
  textContent?: string | null,
  resolveUrl?: (url: string) => string,
) {
  if (!asset) {
    return ''
  }
  const fromBundle = carModelBundleImageUrls(asset, textContent, resolveUrl)[0]
  if (fromBundle) {
    return fromBundle
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const fallback = firstText(
    asset.thumbnailUrl || '',
    recordText(metadata, 'thumbnailUrl'),
    recordText(metadata, 'coverUrl'),
    recordText(metadata, 'coverImageUrl'),
    recordText(metadata, 'firstFrameUrl'),
    recordText(metadata, 'posterUrl'),
    asset.assetType === 'IMAGE' || asset.assetType === 'COVER' ? asset.fileUrl || '' : '',
  )
  return fallback ? normalizeOutputUrl(fallback, resolveUrl) : ''
}

export function buildCarModelBundleAssetRoleBindings(
  asset: BundleAssetLike | null | undefined,
  textContent?: string | null,
  resolveUrl?: (url: string) => string,
): CarSalesAssetRoleBinding[] {
  if (!asset) {
    return []
  }
  const record = parseCarModelBundleRecord(textContent, asset.metadataJson)
  return extractCarModelBundleImageEntries(record).map((entry, index) => ({
    assetId: entry.assetId ?? asset.assetId ?? null,
    url: normalizeOutputUrl(entry.url, resolveUrl),
    assetType: 'IMAGE',
    assetRole: entry.role,
    label: entry.label || `车型图 ${index + 1}`,
    carPackageId: String(asset.assetId),
    carIndex: index,
  })).filter((binding) => Boolean(binding.url))
}

export function carModelBundleDeclaredImageCount(
  asset: BundleAssetLike | null | undefined,
  textContent?: string | null,
) {
  const record = parseCarModelBundleRecord(textContent, asset?.metadataJson)
  return numberField(record, 'imageCount')
    || numberField(record, 'componentCount')
    || arrayLength(record, 'componentAssetIds')
    || arrayLength(record, 'imageAssetIds')
    || arrayLength(record, 'vehicleAssetIds')
    || arrayLength(record, 'carImageAssetIds')
    || extractCarModelBundleImageEntries(record).length
}

export function isLikelyImageReferenceUrl(value?: string | null) {
  const text = String(value || '').trim()
  if (!text) return false
  const lower = text.toLowerCase()
  if (lower.startsWith('data:image/')) return true
  const path = imageReferencePath(lower)
  if (NON_IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension))) {
    return false
  }
  return IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension))
}

function imageEntryFromRow(row: unknown): CarModelBundleImageEntry | null {
  if (typeof row === 'string') {
    const url = row.trim()
    return isLikelyImageReferenceUrl(url) ? { url, role: 'car_exterior_front', label: '车型素材' } : null
  }
  if (!isPlainRecord(row)) {
    return null
  }
  const url = imageUrlFromRecord(row)
  if (!url || !recordLooksLikeImage(row, url)) {
    return null
  }
  return {
    url,
    role: normalizeBundleRole(firstText(
      recordText(row, 'role'),
      recordText(row, 'assetRole'),
      recordText(row, 'type'),
      recordText(row, 'category'),
      recordText(row, 'position'),
    )),
    label: firstText(
      recordText(row, 'label'),
      recordText(row, 'name'),
      recordText(row, 'fileName'),
      recordText(row, 'title'),
    ) || '车型素材',
    assetId: numberOrNull(row.assetId),
  }
}

function imageUrlFromRecord(record: Record<string, unknown>) {
  const direct = firstText(...IMAGE_URL_FIELDS.map((field) => recordText(record, field)))
  if (direct) {
    return direct
  }
  for (const key of NESTED_OBJECT_FIELDS) {
    const child = record[key]
    if (!isPlainRecord(child)) {
      continue
    }
    const nested = firstText(...IMAGE_URL_FIELDS.map((field) => recordText(child, field)))
    if (nested) {
      return nested
    }
  }
  return ''
}

function recordLooksLikeImage(record: Record<string, unknown>, url: string) {
  const assetType = firstText(
    recordText(record, 'assetType'),
    recordText(record, 'mediaType'),
    recordText(record, 'contentKind'),
  ).toLowerCase()
  if (NON_IMAGE_ASSET_TYPES.has(assetType)) {
    return false
  }
  if (IMAGE_ASSET_TYPES.has(assetType)) {
    return isLikelyImageReferenceUrl(url)
  }
  const mime = firstText(
    recordText(record, 'mimeType'),
    recordText(record, 'mime'),
    recordText(record, 'contentType'),
  ).toLowerCase()
  if (mime.startsWith('image/')) {
    return isLikelyImageReferenceUrl(url)
  }
  if (mime.startsWith('text/') || mime.includes('json') || mime.startsWith('audio/') || mime.startsWith('video/')) {
    return false
  }
  return isLikelyImageReferenceUrl(url)
}

function imageReferencePath(value: string) {
  try {
    return new URL(value, 'https://huashuo.local').pathname.toLowerCase()
  } catch {
    return value.split('#')[0].split('?')[0].toLowerCase()
  }
}

function normalizeBundleRole(role: string) {
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliased = ROLE_ALIASES[normalized] || normalized
  return aliased.startsWith('car_') || aliased.startsWith('scene_') || aliased === 'host_image'
    ? aliased
    : 'car_exterior_front'
}

function normalizeOutputUrl(url: string, resolveUrl?: (url: string) => string) {
  const value = url.trim()
  return resolveUrl ? resolveUrl(value) : value
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (isPlainRecord(value)) return value
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return isPlainRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordText(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function numberField(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function arrayLength(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]
  return Array.isArray(value) ? value.length : 0
}

function numberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) {
      return text
    }
  }
  return ''
}
