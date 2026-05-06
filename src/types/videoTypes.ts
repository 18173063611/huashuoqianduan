/** 视频源解析相关类型，字段需与后端 `com.huashuo.video.dto` 保持一致 */

export interface ParseVideoSourceRequest {
  projectId?: number | null
  videoUrl: string
}

export interface VideoParseSceneItem {
  startSec: number
  endSec: number
  label: string
}

export interface VideoParseResultItem {
  videoUrl: string
  durationSeconds: number
  summary: string
  scenes: VideoParseSceneItem[]
}

export interface VideoParseSubmitResponse {
  taskId: number
  status: string
  mockParseResult: VideoParseResultItem
}

export interface VideoParseQueryResponse {
  taskId: number
  status: string
  parseResult: VideoParseResultItem
}
