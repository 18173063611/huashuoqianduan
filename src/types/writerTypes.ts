export interface DouyinParseRequest {
  projectId: number
  videoUrl: string
}

export interface DouyinVideoInfo {
  videoUrl: string
  title: string
  coverUrl: string
  authorName: string
  durationText: string
  likeCountText: string
  commentCountText: string
  publishTime: string
}

export interface DouyinAnalysis {
  theme: string
  targetAudience: string
  coreSellingPoint: string
  scriptStructure: string
  titleFeature: string
  hotReason: string
}

export interface DouyinParseResponse {
  parseId: number
  projectId: number
  videoInfo: DouyinVideoInfo
  analysis: DouyinAnalysis
  sourceScript: string
  rewrittenScript: string
  rewriteStyle: string
  wordCount: number
}

export interface ApplyWriterScriptRequest {
  projectId: number
  parseId?: number
  sourceScript: string
  finalScript: string
  rewriteStyle?: string
}

export interface UpdateWriterScriptRequest {
  projectId: number
  finalScript: string
}

export interface WriterScriptItem {
  scriptId: number
  projectId: number
  parseId?: number
  versionNo: number
  currentStep: string
  nextStep: string
  sourceScript: string
  finalScript: string
  rewriteStyle: string
  createdAt: string
  updatedAt: string
}
