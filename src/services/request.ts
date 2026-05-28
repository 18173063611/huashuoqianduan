import type { ApiResponse } from '../types/apiTypes'
import { formatApiBusinessError } from './apiErrorMessages'
import { notifyAuthRefresh } from './authRefreshHub'
import {
  clearAuthSession,
  getAuthToken as readAuthToken,
  setAuthToken as writeAuthToken,
  type AuthClientType,
} from './authSession'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8080/api/v1' : '/api/v1')

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

interface AuthRequestInit extends RequestInit {
  authClientType?: AuthClientType
  skipAuth?: boolean
}

export function inferAuthClientType(path?: string): AuthClientType {
  const candidate =
    path ||
    (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '')
  return candidate.startsWith('/admin') ? 'ADMIN_WEB' : 'USER_WEB'
}

export function setAuthToken(token: string | null, clientType: AuthClientType = 'USER_WEB') {
  writeAuthToken(token, clientType)
}

export function getAuthToken(clientType: AuthClientType = inferAuthClientType()): string | null {
  return readAuthToken(clientType)
}

function normalizeApiPath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function clientTypeForRequest(apiPath: string, init?: AuthRequestInit): AuthClientType {
  if (init?.authClientType) return init.authClientType
  if (apiPath === '/admin' || apiPath.startsWith('/admin/')) return 'ADMIN_WEB'
  return inferAuthClientType()
}

function shouldSkipAuth(apiPath: string, init?: AuthRequestInit): boolean {
  if (init?.skipAuth) return true
  return apiPath === '/auth/login' || apiPath === '/auth/register'
}

function redirectToLogin(clientType: AuthClientType, errorCode?: string) {
  clearAuthSession(clientType)
  if (typeof window === 'undefined') return

  if (errorCode === 'TOKEN_REVOKED') {
    window.alert('当前账号已在其他设备登录，请重新登录。')
  }

  const { pathname, search, hash } = window.location
  if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login') return

  const currentPath = `${pathname}${search}${hash}`
  const params = new URLSearchParams({ redirect: currentPath })
  const loginPath = clientType === 'ADMIN_WEB' ? '/admin/login' : '/login'
  window.location.assign(`${loginPath}?${params.toString()}`)
}

function shouldNotifyAuthRefreshAfterSuccess(method: string | undefined, apiPath: string): boolean {
  const m = (method || 'GET').toUpperCase()
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') {
    return false
  }
  const p = normalizeApiPath(apiPath)
  if (p.startsWith('/admin/') || p.startsWith('/auth/')) {
    return false
  }
  return (
    p.startsWith('/tasks') ||
    p.startsWith('/voices/tts') ||
    p.startsWith('/voices/presets/') ||
    p.startsWith('/avatars/') ||
    p.startsWith('/video/generate') ||
    p.startsWith('/video/car-sales') ||
    p.startsWith('/video/quick-render') ||
    p.startsWith('/video/script') ||
    p.startsWith('/video-sources/parse') ||
    p.startsWith('/scripts/rewrite') ||
    p.startsWith('/storyboards/')
  )
}

function parseApiResponse<T>(text: string): ApiResponse<T> | null {
  if (!text) return null
  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    return null
  }
}

function buildBusinessError(payload: ApiResponse<unknown>, fallback = '请求失败') {
  const detail = formatApiBusinessError(payload.code, payload.message || fallback)
  return `${detail}${payload.traceId ? `，traceId：${payload.traceId}` : ''}`
}

export async function request<T>(path: string, init?: AuthRequestInit): Promise<T> {
  const apiPath = normalizeApiPath(path)
  const url = `${API_BASE_URL}${apiPath}`
  const clientType = clientTypeForRequest(apiPath, init)
  const token = shouldSkipAuth(apiPath, init) ? null : getAuthToken(clientType)
  const requestInit: AuthRequestInit = init || {}
  const { authClientType, skipAuth, ...fetchInit } = requestInit
  void authClientType
  void skipAuth

  const headers = new Headers(fetchInit.headers)
  if (!(fetchInit.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchInit,
      headers,
    })
  } catch (error) {
    const pageProtocol = typeof window !== 'undefined' ? window.location.protocol : ''
    const mixedContentHint =
      pageProtocol === 'https:' && url.startsWith('http://')
        ? '\n当前页面是 https，但接口是 http，请改用 https 网关或重新配置 VITE_API_BASE_URL。'
        : ''
    throw new Error(`Failed to fetch: ${url}\n请确认后端服务可访问，或检查浏览器 Network/CORS 报错。${mixedContentHint}`)
  }

  const text = await response.text()
  const payload = parseApiResponse<T>(text)

  if (!response.ok) {
    if (response.status === 401 || payload?.code === 40100) {
      redirectToLogin(clientType, payload?.message)
    }
    if (payload) {
      throw new Error(buildBusinessError(payload, `HTTP ${response.status}`))
    }
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  if (!text) {
    return null as T
  }
  if (!payload) {
    throw new Error(`接口返回的不是 JSON: ${text}`)
  }
  if (payload.code === 40100) {
    redirectToLogin(clientType, payload.message)
  }
  if (payload.code !== 0) {
    throw new Error(buildBusinessError(payload))
  }
  if (shouldNotifyAuthRefreshAfterSuccess(fetchInit.method, apiPath)) {
    notifyAuthRefresh()
  }
  return payload.data
}
