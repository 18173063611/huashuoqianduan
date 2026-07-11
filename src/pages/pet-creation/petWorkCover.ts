import { normalizePublicMediaUrl } from '../../utils/mediaUrl'

type RecordLike = Record<string, unknown>

const COVER_FIELDS = [
  'coverUrl',
  'cover_url',
  'thumbnailUrl',
  'posterUrl',
  'poster',
  'poster_url',
  'coverImageUrl',
  'cover_image_url',
  'previewImageUrl',
  'preview_image_url',
  'firstFrameUrl',
  'first_frame_url',
  'lastFrameUrl',
  'last_frame_url',
  'snapshotUrl',
  'imageUrl',
] as const

const VIDEO_FIELDS = [
  'videoUrl',
  'url',
  'video_url',
  'previewUrl',
  'preview_url',
  'downloadUrl',
  'download_url',
  'fileUrl',
  'file_url',
  'playUrl',
  'play_url',
  'resultUrl',
  'result_url',
] as const

const NESTED_FIELDS = [
  'metadata',
  'metadataJson',
  'metadata_json',
  'outputJson',
  'output_json',
  'resultJson',
  'result_json',
  'result',
  'output',
  'payload',
  'payloadJson',
  'draft',
  'data',
  'video',
  'videoResult',
  'taskResult',
  'task_result',
] as const

const SEGMENT_FIELDS = [
  'segmentVideos',
  'segment_videos',
  'videoSegments',
  'video_segments',
  'segments',
  'shots',
  'clips',
  'items',
  'results',
] as const

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function parseJsonObject(value: unknown): unknown {
  if (isRecord(value) || Array.isArray(value)) return value
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function textField(source: RecordLike | null | undefined, key: string) {
  const value = source?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function firstText(source: RecordLike | null | undefined, keys: readonly string[]) {
  for (const key of keys) {
    const value = textField(source, key)
    if (value) return value
  }
  return ''
}

function normalizeMediaUrl(url: string) {
  if (!url) return ''
  if (/^(#|blob:|data:)/i.test(url)) return url
  return normalizePublicMediaUrl(url)
}

function firstNestedMedia(source: RecordLike, keys: readonly string[]) {
  for (const field of SEGMENT_FIELDS) {
    const parsed = parseJsonObject(source[field])
    if (!Array.isArray(parsed)) continue
    for (const item of parsed) {
      if (!isRecord(item)) continue
      const mediaUrl = firstText(item, keys)
      if (mediaUrl) return mediaUrl
    }
  }
  return ''
}

function resolveNestedMediaUrl(source: unknown, keys: readonly string[]) {
  const queue: unknown[] = [source]
  const seen = new Set<unknown>()

  while (queue.length && seen.size < 80) {
    const current = queue.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)

    const parsed = parseJsonObject(current)
    if (Array.isArray(parsed)) {
      queue.push(...parsed)
      continue
    }
    if (!isRecord(parsed)) continue

    const direct = firstText(parsed, keys) || firstNestedMedia(parsed, keys)
    if (direct) return normalizeMediaUrl(direct)

    for (const field of NESTED_FIELDS) {
      const nested = parseJsonObject(parsed[field])
      if (nested) queue.push(nested)
    }
  }

  return ''
}

export function resolvePetWorkCoverUrl(source: unknown) {
  return resolveNestedMediaUrl(source, COVER_FIELDS)
}

export function resolvePetWorkVideoUrl(source: unknown) {
  return resolveNestedMediaUrl(source, VIDEO_FIELDS)
}
