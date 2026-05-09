import { request } from './request'
import type {
  TtsGenerateRequest,
  TtsGenerateResponse,
  TtsTaskDetailResponse,
  VoicePresetCreateRequest,
  VoicePresetItem,
  VoicePresetListResponse,
} from '../types/voiceTypes'

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

/** 新增 / 更新火山音色 POST /api/v1/voices/presets */
export function createVoicePreset(payload: VoicePresetCreateRequest) {
  return request<VoicePresetItem>('/voices/presets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 提交文案转音频 POST /api/v1/voices/tts */
export function generateTts(payload: TtsGenerateRequest) {
  return request<TtsGenerateResponse>('/voices/tts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 查询 TTS 任务 GET /api/v1/voices/tts/{taskId} */
export function getTtsTask(taskId: number) {
  return request<TtsTaskDetailResponse>(`/voices/tts/${taskId}`)
}
