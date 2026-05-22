import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { ApiResponse } from '../types/apiTypes'
import type {
  DouyinParseWithTranscriptEventPayload,
  DouyinRewriteRequest,
  ShareVideoDownloadRequest,
} from '../types/writerDouyinTypes'
import { API_BASE_URL, getAuthToken, request } from './request'
import type { TaskItem } from '../types/taskTypes'

export interface StartDouyinParseWithTranscriptOptions {
  projectId?: number | null
  url: string
  platform?: string
  title?: string
  sourceType?: string
  filePath?: string
  signal?: AbortSignal
  onAccepted?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onParsed?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onTranscribing?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onCompleted?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onErrorEvent?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
}

export interface ShareVideoDownloadProgress {
  fileName: string
  receivedBytes: number
  totalBytes: number | null
  percent: number | null
}

export interface ShareVideoDownloadOptions {
  onStarted?: (progress: ShareVideoDownloadProgress) => void
  onProgress?: (progress: ShareVideoDownloadProgress) => void
}

/**
 * POST SSE：`/api/v1/writer/douyin/parse-with-transcript`
 * `API_BASE_URL` 已包含 `/api/v1` 前缀。
 */
export async function startDouyinParseWithTranscript(options: StartDouyinParseWithTranscriptOptions) {
  const platform = normalizePlatformValue(options.platform)
  const platformPath = normalizePlatformPath(platform)
  const path = platformPath ? `/writer/${platformPath}/parse-with-transcript` : '/writer/douyin/parse-with-transcript'
  const url = `${API_BASE_URL}${path}`

  const token = getAuthToken()
  await fetchEventSource(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...(options.projectId != null ? { projectId: options.projectId } : {}),
      ...(platform ? { platform } : {}),
      ...(options.title?.trim() ? { title: options.title.trim() } : {}),
      ...(options.sourceType?.trim() ? { sourceType: options.sourceType.trim() } : {}),
      ...(options.filePath?.trim() ? { filePath: options.filePath.trim() } : {}),
      url: options.url,
    }),
    signal: options.signal,
    openWhenHidden: true,
    async onopen(response) {
      const ct = response.headers.get('content-type') || ''
      if (response.ok && ct.includes('text/event-stream')) {
        return
      }
      const text = await response.text().catch(() => '')
      throw new Error(text ? `HTTP ${response.status}: ${text}` : `HTTP ${response.status}`)
    },
    onmessage(ev) {
      if (!ev.data) {
        return
      }
      let payload: ApiResponse<DouyinParseWithTranscriptEventPayload>
      try {
        payload = JSON.parse(ev.data) as ApiResponse<DouyinParseWithTranscriptEventPayload>
      } catch {
        return
      }
      if (payload.code !== 0) {
        options.onErrorEvent?.(payload)
        return
      }
      const stage = payload.data?.stage
      if (!stage) {
        return
      }
      if (stage === 'accepted') {
        options.onAccepted?.(payload)
        return
      }
      if (stage === 'parsed') {
        options.onParsed?.(payload)
        return
      }
      if (stage === 'transcribing') {
        options.onTranscribing?.(payload)
        return
      }
      if (stage === 'completed') {
        options.onCompleted?.(payload)
        return
      }
      if (stage === 'error') {
        options.onErrorEvent?.(payload)
      }
    },
    onerror(err) {
      throw err instanceof Error ? err : new Error(String(err))
    },
  })
}

/**
 * POST JSON：`/writer/douyin/rewrite`
 * 对已有口播文案做 AI 改写；`style`、`introduce` 为空时不写入请求体。
 */
export function rewriteDouyinCopywriting(body: DouyinRewriteRequest) {
  const payload: Record<string, string> = {
    originalText: body.originalText,
  }
  if (body.style?.trim()) {
    payload.style = body.style.trim()
  }
  if (body.introduce?.trim()) {
    payload.introduce = body.introduce.trim()
  }
  return request<TaskItem>('/writer/douyin/rewrite', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST 二进制：`/writer/videos/download`
 * 平台视频直链常有 CORS/Referer 限制，下载统一走后端代理并使用 Content-Disposition 文件名。
 */
export async function downloadShareVideo(body: ShareVideoDownloadRequest, options: ShareVideoDownloadOptions = {}) {
  const url = `${API_BASE_URL}/writer/videos/download`
  const token = getAuthToken()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      url: body.url,
      ...(body.platform ? { platform: normalizePlatformPath(body.platform) || body.platform } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(await readDownloadError(response))
  }

  const fileName = resolveDownloadFileName(response.headers.get('Content-Disposition') || '')
  const totalBytes = parsePositiveInt(response.headers.get('Content-Length'))
  options.onStarted?.({
    fileName,
    receivedBytes: 0,
    totalBytes,
    percent: null,
  })

  const blob = await readDownloadBlob(response, fileName, totalBytes, options)
  if (blob.size <= 0) {
    throw new Error('下载失败：视频内容为空')
  }
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

async function readDownloadBlob(
  response: Response,
  fileName: string,
  totalBytes: number | null,
  options: ShareVideoDownloadOptions,
) {
  if (!response.body) {
    const blob = await response.blob()
    options.onProgress?.({
      fileName,
      receivedBytes: blob.size,
      totalBytes: totalBytes ?? blob.size,
      percent: 100,
    })
    return blob
  }

  const reader = response.body.getReader()
  const chunks: ArrayBuffer[] = []
  let receivedBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    const chunk = new Uint8Array(value)
    chunks.push(chunk.buffer)
    receivedBytes += chunk.byteLength
    options.onProgress?.({
      fileName,
      receivedBytes,
      totalBytes,
      percent: totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null,
    })
  }
  return new Blob(chunks, { type: response.headers.get('Content-Type') || 'video/mp4' })
}

function parsePositiveInt(value: string | null) {
  if (!value) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizePlatformPath(value?: string | null) {
  const normalized = normalizePlatformValue(value)
  if (!normalized) {
    return ''
  }
  return encodeURIComponent(normalized)
}

function normalizePlatformValue(value?: string | null) {
  const normalized = (value || '').trim().toLowerCase()
  if (!normalized || normalized === 'auto') {
    return ''
  }
  return normalized
}

async function readDownloadError(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) {
    return `下载失败：HTTP ${response.status}`
  }
  try {
    const payload = JSON.parse(text) as ApiResponse<unknown>
    return `${payload.message || `下载失败：HTTP ${response.status}`}${payload.traceId ? `，traceId：${payload.traceId}` : ''}`
  } catch {
    return `下载失败：HTTP ${response.status}，${text}`
  }
}

function resolveDownloadFileName(disposition: string) {
  const fallback = 'share-video.mp4'
  if (!disposition) {
    return fallback
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ''))
    } catch {
      return utf8Match[1].replace(/^"|"$/g, '') || fallback
    }
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] ? plainMatch[1] : fallback
}
