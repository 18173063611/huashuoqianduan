/** 视频源解析相关类型，字段需与后端 `com.huashuo.video.dto` 保持一致 */

import type { TaskItem } from './taskTypes'

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
  /** 可选画面提示词，兼容后端 storyboard/scenes/segments 等结构 */
  visualPrompt?: string
  prompt?: string
  /** 可选镜头控制字段，兼容外部或后续结构化分镜 */
  camera?: string
  cameraMotion?: string
  movement?: string
  shotType?: string
  framing?: string
  composition?: string
  transition?: string
  /** 背景音乐风格、节奏或具体音乐，无值时返回 "无" */
  backgroundMusic: string
  /** 口播文案 / 旁白 / 字幕分析，无值时返回 "无" */
  content: string
  /** 该分镜核心亮点或表达意图 */
  highlight: string
}

/** 视频生成任务的统一响应，对应后端 VideoTaskVO（火山方舟 Seedance） */
export interface VideoTaskVO {
  taskId: string
  localTaskId?: number
  model: string
  status: string
  createdAt?: number
  updatedAt?: number
  videoUrl: string
  resultAssetId?: number | null
  segmentVideos?: VideoTaskVO[]
  segmentAssetIds?: number[]
  finalAssetId?: number | null
  segmentCount?: number
  completedSegmentCount?: number
  partial?: boolean
  stage?: string
  totalDurationSeconds?: number
  durationSeconds?: number
  lastFrameUrl: string | null
  completionTokens: number
  errorCode: string | null
  errorMessage: string | null
}

export interface VideoScriptAnalyzeResult {
  scripts: VideoScriptShotItem[]
}

export interface DigitalHumanGenerateResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
}

export interface DigitalHumanTaskDetailResponse {
  taskId: number
  projectId: number | null
  taskType: string
  status: string
  progress: number | null
  errorMessage: string | null
  model: string | null
  videoUrl: string | null
  resultAssetId: number | null
  coverUrl: string | null
  credits: number | null
}

export type QuickRenderIntent = 'auto' | 'car_sales' | 'digital_human' | 'general_video' | 'material_mix'

export type QuickRenderAssetRole =
  | 'car_exterior_front'
  | 'car_exterior_side'
  | 'car_exterior_rear'
  | 'car_interior_dashboard'
  | 'car_interior_front_seat'
  | 'car_interior_back_seat'
  | 'car_detail_light'
  | 'car_detail_wheel'
  | 'car_detail_logo'
  | 'scene_showroom'
  | 'scene_outdoor'
  | 'scene_road'
  | 'host_image'
  | 'voiceover'
  | 'bgm'
  | 'reference_audio'
  | 'subtitle'
  | 'voice_script'
  | 'storyboard_json'
  | 'benchmark_json'
  | 'car_model_bundle'
  | 'material_video'
  | 'host_video'
  | 'reference_video'
  | 'material'

export interface QuickRenderRequest {
  intent: QuickRenderIntent
  assetIds: number[]
  assetRoles: Record<string, QuickRenderAssetRole>
  assetTextContents?: Record<string, string>
  aspectRatio: '9:16' | '16:9' | 'auto'
  subtitleMode: 'off' | 'auto' | 'upload'
  subtitleLanguage?: string
  nativeVoiceLanguage?: string
  burnInSubtitle: boolean
  customSubtitle?: string
  audioPolicy: 'auto' | 'none' | 'voiceover' | 'bgm'
  model: string
  segmentCount?: number
  segmentDuration?: number
  goalText?: string
  projectId?: number | null
}

export interface QuickRenderRecognizedAsset {
  assetId: number
  fileName: string
  assetType: string
  mimeType: string | null
  role: QuickRenderAssetRole | string
  url: string
}

export interface QuickRenderResponse {
  route: 'car_sales' | 'digital_human' | 'general_video' | 'material_mix'
  task?: TaskItem | null
  digitalHumanTask?: DigitalHumanGenerateResponse | null
  assets: QuickRenderRecognizedAsset[]
  summary: string
  normalizedRequest?: unknown
}

export interface DigitalHumanVideoRequest {
  projectId?: number | null
  imageUrl: string
  audioUrl?: string
  text?: string
  voiceId?: string
  prompt?: string
  resolution?: '540p' | '720p' | '1080p'
  model?: string
}

/** 文生视频请求体 */
export interface TextToVideoRequest {
  prompt: string
  duration?: number
  ratio?: string
  model?: string
}

/** 图生视频 - 首帧生成请求体 */
export interface FirstFrameVideoRequest {
  imageUrl: string
  prompt?: string
  duration?: number
  ratio?: string
  model?: string
}

/** 图生视频 - 首尾帧生成请求体 */
export interface FirstLastFrameVideoRequest {
  firstFrameUrl: string
  lastFrameUrl: string
  prompt?: string
  duration?: number
  ratio?: string
  model?: string
}

/** 图生视频 - 参照图生成请求体（imageUrls 长度 1~9，lite i2v 推荐 1~4） */
export interface ReferenceVideoRequest {
  imageUrls: string[]
  prompt?: string
  duration?: number
  ratio?: string
  model?: string
}

export interface CarSalesVideoSceneRequest {
  segmentIndex?: number
  title?: string
  visualPrompt?: string
  prompt?: string
  imageUrls?: string[]
  referenceImage?: string
  voiceText?: string
  duration?: number
}

export interface CarSalesAssetRoleBinding {
  assetId?: number
  url?: string
  assetType?: string
  assetRole?: string
  label?: string
}

export interface CarSalesVideoRequest {
  projectId?: number | null
  carImageUrls: string[]
  brandModel?: string
  sellingPoints?: string
  audience?: string
  callToAction?: string
  scriptContext?: string
  prompt?: string
  subtitle?: string
  subtitleMode?: 'off' | 'auto' | 'custom'
  subtitleLanguage?: string
  audioUrl?: string
  audioMode?: 'none' | 'post_mix' | 'reference' | 'model_native'
  bgmUrl?: string
  voicePolicy?: 'user_audio' | 'model_native' | 'none'
  finalVoiceText?: string
  generatedVoiceAssetId?: number
  generatedVoiceUrl?: string
  autoTtsVoiceId?: number
  autoTtsSpeed?: number
  autoTtsVolume?: number
  autoTtsPitch?: number
  nativeVoiceLanguage?: string
  nativeVoiceStyle?: string
  nativeSpeechStyle?: string
  ignoredStoryboardFields?: string[]
  hostImageUrl?: string
  hostAppearanceEnabled?: boolean
  hostVideoUrl?: string
  sourceAssetIds?: number[]
  renderMode?: 'manual' | 'quick'
  aspectRatio?: string
  quickAssetIds?: number[]
  assetRoleBindings?: CarSalesAssetRoleBinding[]
  segmentCount?: number
  segmentDuration?: number
  scenes?: CarSalesVideoSceneRequest[]
  model?: string
}

export interface CarSalesSegmentComposeItem {
  assetId?: number | null
  videoUrl?: string
  title?: string
}

export interface CarSalesSegmentComposeRequest {
  segments: CarSalesSegmentComposeItem[]
}
