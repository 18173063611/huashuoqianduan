/** TTS 相关类型，与后端 `com.huashuo.tts.dto` 及资产 `AssetItem` 字段对齐 */

import type { AssetItem } from './assetTypes'

/** 规范示例名 GenerateTtsRequest，与《后端文件代码开发规范》§10 一致 */
export interface GenerateTtsRequest {
  projectId: number
  scriptVersionId: number
  voiceCode: string
}

export interface GenerateTtsResponse {
  taskId: number
  status: string
  audioAsset: AssetItem
}
