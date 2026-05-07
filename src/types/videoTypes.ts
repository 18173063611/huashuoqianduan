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

/** 视频分镜解析返回的单个分镜，对应后端 ScriptVO */
export interface VideoScriptShotItem {
  /** 分镜序号，从 1 开始 */
  order: number
  /** 起止时间或时长，例如 00:00:03-00:00:08 */
  time: string
  /** 画面内容（人物 / 场景 / 动作 / 视觉元素） */
  page: string
  /** 背景音乐风格、节奏或具体音乐，无值时返回 "无" */
  backgroundMusic: string
  /** 口播文案 / 旁白 / 字幕分析，无值时返回 "无" */
  content: string
  /** 该分镜核心亮点或表达意图 */
  highlight: string
}
