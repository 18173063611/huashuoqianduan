import { request } from './request'
import { newIdempotencyKey } from './taskApi'
import type {
  CarSalesSegmentComposeRequest,
  CarSalesAiPlanRequest,
  CarSalesAiPlanResponse,
  CarSalesVideoRequest,
  DigitalHumanGenerateResponse,
  DigitalHumanTaskDetailResponse,
  DigitalHumanVideoRequest,
  FirstFrameVideoRequest,
  FirstLastFrameVideoRequest,
  ParseVideoSourceRequest,
  QuickRenderRequest,
  QuickRenderResponse,
  ReferenceVideoRequest,
  TextToVideoRequest,
  VideoParseQueryResponse,
  VideoParseSubmitResponse,
  VideoTaskVO,
} from '../types/videoTypes'
import type { TaskItem } from '../types/taskTypes'

interface VideoRequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

const AI_VIDEO_ANALYSIS_TIMEOUT_MS = 120000
const AI_PLAN_REQUEST_TIMEOUT_MS = 120000

function idempotencyHeaders(explicitKey?: string | null): Record<string, string> {
  const key =
    explicitKey != null && String(explicitKey).trim().length > 0
      ? String(explicitKey).trim()
      : newVideoIdempotencyKey()
  return { 'Idempotency-Key': key }
}

/** 生成视频请求使用的幂等键，格式为 video:<uuid>。 */
export function newVideoIdempotencyKey(): string {
  return `video:${newIdempotencyKey()}`
}

function videoGenerateHeaders(): Record<string, string> {
  return idempotencyHeaders()
}

/** 提交视频源解析任务。 */
export function parseVideoSource(payload: ParseVideoSourceRequest) {
  return request<VideoParseSubmitResponse>('/video-sources/parse', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 按 taskId 查询解析结果（占位实现会在首次查询时将任务置为成功） */
export function getVideoParseResult(taskId: number) {
  return request<VideoParseQueryResponse>(`/video-sources/parse/${taskId}`)
}

/** 视频分镜解析：将公网可访问的视频 URL 交给火山引擎视觉模型，返回逐镜头脚本数组。 */
export function analyzeVideoScript(videoUrl: string, options: VideoRequestOptions = {}) {
  // 链接里可能含有 ? 与中文，必须先 encodeURIComponent，否则后端接到的 url 会被截断
  const qs = `url=${encodeURIComponent(videoUrl)}`
  return request<TaskItem>(`/video/script/analy?${qs}`, {
    method: 'POST',
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? AI_VIDEO_ANALYSIS_TIMEOUT_MS,
  })
}

/** 视频链接分镜解析：后端复用爆款对标的分享链接解析，再对真实播放地址做分镜分析。 */
export function analyzeVideoScriptByUrl(videoUrl: string, platform?: string, options: VideoRequestOptions = {}) {
  const params = new URLSearchParams({ url: videoUrl })
  if (platform && platform !== 'auto') {
    params.set('platform', platform)
  }
  const qs = params.toString()
  return request<TaskItem>(`/video/script/url?${qs}`, {
    method: 'POST',
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? AI_VIDEO_ANALYSIS_TIMEOUT_MS,
  })
}

/**
 * 文生视频。后端会同步轮询火山方舟，1~3 分钟后返回最终 videoUrl。
 * 仅传必填字段，其它分辨率/比例/水印等参数由后端按文档默认值固定。
 */
export function generateTextToVideo(payload: TextToVideoRequest) {
  return request<TaskItem>('/video/generate/text', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: videoGenerateHeaders(),
  })
}

/** 图生视频 - 首帧生成。仅支持公网 URL / Base64 / asset:// 三种 imageUrl 取值。 */
export function generateFirstFrameVideo(payload: FirstFrameVideoRequest) {
  return request<TaskItem>('/video/generate/image/first-frame', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: videoGenerateHeaders(),
  })
}

/** 图生视频 - 首尾帧生成。模型以首帧为主，尾帧自动居中裁剪适配。 */
export function generateFirstLastFrameVideo(payload: FirstLastFrameVideoRequest) {
  return request<TaskItem>('/video/generate/image/first-last-frame', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: videoGenerateHeaders(),
  })
}

/** 图生视频 - 参照图生成。imageUrls 长度 1~9，lite i2v 实际支持 1~4。 */
export function generateReferenceVideo(payload: ReferenceVideoRequest) {
  return request<TaskItem>('/video/generate/image/reference', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: videoGenerateHeaders(),
  })
}

export function generateCarSalesVideo(payload: CarSalesVideoRequest) {
  return request<TaskItem>('/video/generate/car-sales', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: videoGenerateHeaders(),
  })
}

export function regenerateCarSalesSegment(taskId: number, segmentIndex: number) {
  return request<TaskItem>(`/video/car-sales/${taskId}/segments/${segmentIndex}/regenerate`, {
    method: 'POST',
    headers: videoGenerateHeaders(),
  })
}

export function adoptCarSalesSegment(taskId: number, segmentIndex: number, regeneratedTaskId: number) {
  return request<VideoTaskVO>(`/video/car-sales/${taskId}/segments/${segmentIndex}/adopt`, {
    method: 'POST',
    body: JSON.stringify({ regeneratedTaskId }),
  })
}

export function composeCarSalesSegments(taskId: number, payload: CarSalesSegmentComposeRequest) {
  return request<VideoTaskVO>(`/video/car-sales/${taskId}/segments/compose`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function generateDigitalHumanVideo(payload: DigitalHumanVideoRequest, idempotencyKey?: string | null) {
  return request<DigitalHumanGenerateResponse>('/video/generate/digital-human', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: idempotencyHeaders(idempotencyKey),
  })
}

export function quickRenderVideo(payload: QuickRenderRequest, idempotencyKey?: string | null) {
  return request<QuickRenderResponse>('/video/quick-render', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: idempotencyHeaders(idempotencyKey),
  })
}

export function generateCarSalesAiPlan(payload: CarSalesAiPlanRequest) {
  return request<CarSalesAiPlanResponse>('/video/car-sales/ai-plan', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: AI_PLAN_REQUEST_TIMEOUT_MS,
  })
}

export function getDigitalHumanVideoTask(taskId: number) {
  return request<DigitalHumanTaskDetailResponse>(`/video/generate/digital-human/${taskId}`)
}
