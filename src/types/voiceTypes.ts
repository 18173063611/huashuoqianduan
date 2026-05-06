/** 文案转音频，与后端 `com.huashuo.voice.dto` 对齐 */

import type { AssetItem } from './assetTypes'

export interface VoicePresetItem {
  voiceId: number
  provider: string
  voiceName: string
  gender: string
  scene: string | null
  sampleUrl: string | null
}

export interface VoicePresetListResponse {
  records: VoicePresetItem[]
}

export interface TtsGenerateRequest {
  projectId?: number | null
  /** 对应后端脚本版本主键 `script_version_id` */
  scriptId?: number
  text?: string
  voiceId: number
  provider?: string
  speed?: number
  pitch?: number
  volume?: number
}

export interface TtsGenerateResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
}

export interface TtsTaskDetailResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
  progress: number | null
  errorMessage: string | null
  audioAsset: AssetItem | null
}
