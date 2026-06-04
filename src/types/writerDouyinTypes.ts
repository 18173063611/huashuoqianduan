/** 与 huaye-ai `writer-douyin-parse-with-transcript` SSE 文档保持一致 */

export interface DouyinAuthorInfo {
  id: string
  secUid: string
  nickname: string
  avatarUrl: string
}

export interface DouyinVideoParseResponse {
  videoId: string
  playUrl: string
  title: string
  author: DouyinAuthorInfo
  coverUrl: string
  durationSeconds: number
  sourceEndpoint: string
  requestId: string
  rawData: unknown
}

export interface ShareVideoDownloadRequest {
  url: string
  platform?: string
  title?: string
}

export interface WriterTranscriptVO {
  originalText: string
  translatedText: string
}

export type DouyinParseStage = 'accepted' | 'parsed' | 'transcribing' | 'completed' | 'error'

export interface DouyinParseWithTranscriptEventPayload {
  stage: DouyinParseStage
  taskId?: number | null
  parseResult: DouyinVideoParseResponse | null
  transcriptResult: WriterTranscriptVO | null
}

export interface DouyinParseTaskResult {
  parseResult?: DouyinVideoParseResponse | null
  transcriptResult?: WriterTranscriptVO | null
  resultAssetId?: number | null
  previewUrl?: string | null
}

/** POST `/writer/douyin/rewrite`，与 huaye-ai `writer-douyin-rewrite.md` 一致 */
export interface DouyinRewriteRequest {
  originalText: string
  style?: string
  targetLanguage?: string
  introduce?: string
}

/** 改写接口成功时 `data`：`originalText` 固定为 `null` */
export interface DouyinRewriteWriterVO {
  originalText: string | null
  translatedText: string
}
