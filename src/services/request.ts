import type { ApiResponse } from '../types/apiTypes'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://huashuohouduan.onrender.com/api/v1'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const requestInit: RequestInit = { ...init }
  // FormData 由浏览器自动生成 multipart boundary，不能手动设置 Content-Type。
  if (!(init?.body instanceof FormData)) {
    requestInit.headers = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    }
  }
  const response = await fetch(url, {
    ...requestInit,
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  if (!text) {
    return null as T
  }

  let payload: ApiResponse<T>
  try {
    payload = JSON.parse(text) as ApiResponse<T>
  } catch (error) {
    console.error('接口返回的不是 JSON:', text)
    throw error
  }
  if (payload.code !== 0) {
    // 统一把后端 message 和 traceId 抛给页面，方便联调时快速定位问题。
    throw new Error(`${payload.message || '请求失败'}${payload.traceId ? `，traceId：${payload.traceId}` : ''}`)
  }
  return payload.data
}