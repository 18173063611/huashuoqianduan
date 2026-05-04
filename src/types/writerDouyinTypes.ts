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

export interface WriterTranscriptVO {
  originalText: string
  translatedText: string
}

export type DouyinParseStage = 'parsed' | 'transcribing' | 'completed' | 'error'

export interface DouyinParseWithTranscriptEventPayload {
  stage: DouyinParseStage
  parseResult: DouyinVideoParseResponse | null
  transcriptResult: WriterTranscriptVO | null
}
