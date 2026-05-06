import type { ApiResponse } from '../types/apiTypes'

/** 开发默认连本机；生产或未配置时使用线上占位，也可用环境变量覆盖。 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8080/api/v1' : 'https://huashuohouduan.onrender.com/api/v1')

/** 用于拼接 /uploads 等静态资源的绝对地址 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

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
  let response: Response
  try {
    response = await fetch(url, {
      ...requestInit,
    })
  } catch (error) {
    // fetch 网络层失败（服务不可达 / CORS / Mixed Content）会直接抛 TypeError，前端只看到 “Failed to fetch”
    const pageProtocol = typeof window !== 'undefined' ? window.location.protocol : ''
    const mixedContentHint =
      pageProtocol === 'https:' && url.startsWith('http://')
        ? '当前页面是 https，但请求了 http 接口（浏览器会拦截 Mixed Content）。请把后端/网关也改为 https，或用隧道工具暴露 https 地址后再配置 VITE_API_BASE_URL。'
        : ''
    const corsHint = '若后端已启动但仍失败，请检查浏览器控制台 Network/CORS 报错与后端 CORS 配置。'
    const reachabilityHint = '请确认后端服务可访问，或设置 VITE_API_BASE_URL 指向正确的 /api/v1。'
    throw new Error(
      `Failed to fetch: ${url}\n${reachabilityHint}${mixedContentHint ? `\n${mixedContentHint}` : ''}\n${corsHint}`,
    )
  }

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