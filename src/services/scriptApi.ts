import { request } from './request'
import type {
  RewriteScriptRequest,
  RewriteScriptResponse,
  ScriptVersionItem,
  StoryboardGenerateRequest,
  StoryboardGenerateResponse,
} from '../types/scriptTypes'

/** 文案改写。 */
export function rewriteScript(payload: RewriteScriptRequest) {
  return request<RewriteScriptResponse>('/scripts/rewrite', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 全部文案版本 */
export function getScripts() {
  return request<ScriptVersionItem[]>('/scripts')
}

/** 分镜生成占位 */
export function generateStoryboard(payload: StoryboardGenerateRequest) {
  return request<StoryboardGenerateResponse>('/storyboards/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
