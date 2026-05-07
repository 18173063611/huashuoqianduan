import { request } from './request'
import type {
  ApplyWriterScriptRequest,
  DouyinParseRequest,
  DouyinParseResponse,
  UpdateWriterScriptRequest,
  WriterScriptItem,
} from '../types/writerTypes'

/** 解析抖音视频并返回原文案、爆款分析和 AI 改写文案。该接口由其他同学提供实现。 */
export function parseDouyinVideo(payload: DouyinParseRequest) {
  return request<DouyinParseResponse>('/writer/douyin/parse', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 保存用户最终确认的文案，供后续流程使用。 */
export function applyWriterScript(payload: ApplyWriterScriptRequest) {
  return request<WriterScriptItem>('/writer/scripts/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 查询当前已应用的文案草稿（全局，不按项目过滤）。 */
export function getCurrentWriterScript() {
  return request<WriterScriptItem | null>('/writer/scripts/current')
}

/** 保存用户手动编辑后的最终文案。 */
export function updateWriterScript(scriptId: number, payload: UpdateWriterScriptRequest) {
  return request<WriterScriptItem>(`/writer/scripts/${scriptId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
