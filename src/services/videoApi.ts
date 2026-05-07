import { request } from './request'
import type {
  ParseVideoSourceRequest,
  VideoParseQueryResponse,
  VideoParseSubmitResponse,
  VideoScriptShotItem,
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
