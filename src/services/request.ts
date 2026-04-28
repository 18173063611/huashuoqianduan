import type { ApiResponse } from '../types/apiTypes'

const API_PREFIX = '/api/v1'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = { ...init }
  // FormData 由浏览器自动生成 multipart boundary，不能手动设置 Content-Type。
  if (!(init?.body instanceof FormData)) {
    requestInit.headers = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    }
  }
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...requestInit,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.code !== 0) {
    // 统一把后端 message 和 traceId 抛给页面，方便联调时快速定位问题。
    throw new Error(`${payload.message || 'Request failed'}${payload.traceId ? `, traceId: ${payload.traceId}` : ''}`)
  }
  return payload.data
}