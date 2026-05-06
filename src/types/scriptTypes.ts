/** 文案 / 分镜相关类型，字段需与后端 `com.huashuo.script.dto`、`com.huashuo.storyboard.dto` 对齐 */

export interface RewriteScriptRequest {
  projectId?: number | null
  sourceText: string
  style: string
  targetLength: number
}

export interface RewriteScriptResponse {
  taskId: number
  status: string
  scriptVersionId: number
  versionNo: number
  rewrittenText: string
}

export interface ScriptVersionItem {
  scriptVersionId: number
  projectId: number | null
  versionNo: number
  content: string
  sourceType: string
  createdAt: string
  updatedAt: string
}

export interface StoryboardGenerateRequest {
  projectId?: number | null
  scriptVersionId: number
}

export interface StoryboardShotItem {
  index: number
  visual: string
  narration: string
  estDurationSec: number
}

export interface StoryboardGenerateResponse {
  taskId: number
  status: string
  storyboard: StoryboardShotItem[]
}
