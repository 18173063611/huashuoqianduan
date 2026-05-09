import { request } from './request'
import type {
  DigitalHumanGenerateResponse,
  DigitalHumanTaskDetailResponse,
  DigitalHumanVideoRequest,
  FirstFrameVideoRequest,
  FirstLastFrameVideoRequest,
  ParseVideoSourceRequest,
  ReferenceVideoRequest,
  TextToVideoRequest,
  VideoParseQueryResponse,
  VideoParseSubmitResponse,
  VideoScriptShotItem,
  VideoTaskVO,
} from '../types/videoTypes'

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
export function analyzeVideoScript(videoUrl: string) {
  // 链接里可能含有 ? 与中文，必须先 encodeURIComponent，否则后端接到的 url 会被截断
  const qs = `url=${encodeURIComponent(videoUrl)}`
  return request<VideoScriptShotItem[]>(`/video/script/analy?${qs}`, {
    method: 'POST',
  })
}

/** 视频链接分镜解析：后端先解析分享链接，再对真实播放地址做分镜分析。 */
export function analyzeVideoScriptByUrl(videoUrl: string) {
  const qs = `url=${encodeURIComponent(videoUrl)}`
  return request<VideoScriptShotItem[]>(`/video/script/url?${qs}`, {
    method: 'POST',
  })
}

/**
 * 文生视频。后端会同步轮询火山方舟，1~3 分钟后返回最终 videoUrl。
 * 仅传必填字段，其它分辨率/比例/水印等参数由后端按文档默认值固定。
 */
export function generateTextToVideo(payload: TextToVideoRequest) {
  return request<VideoTaskVO>('/video/generate/text', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 图生视频 - 首帧生成。仅支持公网 URL / Base64 / asset:// 三种 imageUrl 取值。 */
export function generateFirstFrameVideo(payload: FirstFrameVideoRequest) {
  return request<VideoTaskVO>('/video/generate/image/first-frame', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 图生视频 - 首尾帧生成。模型以首帧为主，尾帧自动居中裁剪适配。 */
export function generateFirstLastFrameVideo(payload: FirstLastFrameVideoRequest) {
  return request<VideoTaskVO>('/video/generate/image/first-last-frame', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 图生视频 - 参照图生成。imageUrls 长度 1~9，lite i2v 实际支持 1~4。 */
export function generateReferenceVideo(payload: ReferenceVideoRequest) {
  return request<VideoTaskVO>('/video/generate/image/reference', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function generateDigitalHumanVideo(payload: DigitalHumanVideoRequest) {
  return request<DigitalHumanGenerateResponse>('/video/generate/digital-human', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getDigitalHumanVideoTask(taskId: number) {
  return request<DigitalHumanTaskDetailResponse>(`/video/generate/digital-human/${taskId}`)
}
