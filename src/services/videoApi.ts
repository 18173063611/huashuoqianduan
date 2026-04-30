import { request } from './request'
import type {
  ParseVideoSourceRequest,
  VideoParseQueryResponse,
  VideoParseSubmitResponse,
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
