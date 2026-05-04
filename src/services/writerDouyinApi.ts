import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { ApiResponse } from '../types/apiTypes'
import type { DouyinParseWithTranscriptEventPayload } from '../types/writerDouyinTypes'
import { API_BASE_URL } from './request'

export interface StartDouyinParseWithTranscriptOptions {
  url: string
  signal?: AbortSignal
  onParsed?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onTranscribing?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onCompleted?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
  onErrorEvent?: (payload: ApiResponse<DouyinParseWithTranscriptEventPayload>) => void
}

/**
 * POST SSE：`/api/v1/writer/douyin/parse-with-transcript`
 * `API_BASE_URL` 已包含 `/api/v1` 前缀。
 */
export async function startDouyinParseWithTranscript(options: StartDouyinParseWithTranscriptOptions) {
  const path = '/writer/douyin/parse-with-transcript'
  const url = `${API_BASE_URL}${path}`

  await fetchEventSource(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ url: options.url }),
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
