import { request } from './request'
import type {
  TtsGenerateRequest,
  TtsGenerateResponse,
  TtsTaskDetailResponse,
  VoicePresetCreateRequest,
  VoicePresetItem,
  VoicePresetListResponse,
} from '../types/voiceTypes'

/** 可用音色列表 GET /api/v1/voices/presets */
export function getVoicePresets() {
  return request<VoicePresetListResponse>('/voices/presets')
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
