import { request } from './request'
import { newIdempotencyKey } from './taskApi'
import type {
  TtsGenerateRequest,
  TtsGenerateResponse,
  VoicePresetCreateRequest,
  VoicePresetItem,
  VoicePresetListResponse,
} from '../types/voiceTypes'

function idempotencyHeaders(explicitKey?: string | null): Record<string, string> {
  const key =
    explicitKey != null && String(explicitKey).trim().length > 0
      ? String(explicitKey).trim()
      : newIdempotencyKey()
  return { 'Idempotency-Key': key }
}

/** 已登录时为私人音色库；未登录时为公共目录（与 catalog 相同）。GET /api/v1/voices/presets */
export function getVoicePresets() {
  return request<VoicePresetListResponse>('/voices/presets')
}

/** 公共音色目录（资产中心「公共音色库」）GET /api/v1/voices/catalog */
export function getVoiceCatalog() {
  return request<VoicePresetListResponse>('/voices/catalog')
}

/** 加入私人音色库 POST /api/v1/voices/library */
export function addVoiceToMyLibrary(voiceId: number) {
  return request<null>('/voices/library', {
    method: 'POST',
    body: JSON.stringify({ voiceId }),
  })
}

/** 从私人音色库移除 DELETE /api/v1/voices/library/{voiceId} */
export function removeVoiceFromMyLibrary(voiceId: number) {
  return request<null>(`/voices/library/${voiceId}`, { method: 'DELETE' })
}

/** 获取/生成试听音频 GET /api/v1/voices/presets/{voiceId}/sample */
export function getVoiceSample(voiceId: number, text?: string) {
  const params = text ? `?text=${encodeURIComponent(text)}` : ''
  return request<{ voiceId: number; sampleUrl: string }>(`/voices/presets/${voiceId}/sample${params}`)
}

export type CreateVoiceSampleTaskOptions = {
  text?: string
  idempotencyKey?: string | null
}

/** 第二参数可为试听文案字符串，或 { text, idempotencyKey }（兼容仅 voiceId） */
export function createVoiceSampleTask(
  voiceId: number,
  second?: string | CreateVoiceSampleTaskOptions,
) {
  let text: string | undefined
  let idempotencyKey: string | null | undefined
  if (typeof second === 'string') {
    text = second
  } else if (second && typeof second === 'object') {
    text = second.text
    idempotencyKey = second.idempotencyKey
  }
  const body =
    text != null && String(text).trim().length > 0 ? JSON.stringify({ text: String(text).trim() }) : JSON.stringify({})
  return request<{ taskId: number; status: string }>(`/voices/presets/${voiceId}/sample/tasks`, {
    method: 'POST',
    body,
    headers: idempotencyHeaders(idempotencyKey),
  })
}

/** 新增 / 更新火山音色 POST /api/v1/voices/presets */
export function createVoicePreset(payload: VoicePresetCreateRequest) {
  return request<VoicePresetItem>('/voices/presets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param idempotencyKey 同一次用户操作内复用；不传则每次请求自动生成 */
export function generateTts(payload: TtsGenerateRequest, idempotencyKey?: string | null) {
  return request<TtsGenerateResponse>('/voices/tts', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: idempotencyHeaders(idempotencyKey),
  })
}

