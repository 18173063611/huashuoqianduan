import { request } from './request'
import {
  clearAuthSession,
  clearAuthUser,
  getAuthUser,
  setAuthToken,
  setAuthUser,
  type AuthClientType,
} from './authSession'
import type { LoginRequest, LoginResponse, RegisterRequest, UserMe } from '../types/userTypes'

function getDeviceId(clientType: AuthClientType) {
  if (typeof window === 'undefined') return undefined
  const key = clientType === 'ADMIN_WEB' ? 'huashuo_admin_device_id' : 'huashuo_user_device_id'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing?.trim()) return existing.trim()
    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem(key, generated)
    return generated
  } catch {
    return undefined
  }
}

function withClient<T extends LoginRequest | RegisterRequest>(payload: T, clientType: AuthClientType): T {
  return {
    ...payload,
    clientType,
    deviceId: payload.deviceId || getDeviceId(clientType),
  }
}

export function register(payload: RegisterRequest, clientType: AuthClientType = 'USER_WEB') {
  return request<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(withClient(payload, clientType)),
    authClientType: clientType,
    skipAuth: true,
  })
}

export function login(payload: LoginRequest, clientType: AuthClientType = 'USER_WEB') {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(withClient(payload, clientType)),
    authClientType: clientType,
    skipAuth: true,
  })
}

export function logout(clientType: AuthClientType = 'USER_WEB') {
  return request<void>('/auth/logout', { method: 'POST', authClientType: clientType })
}

export function me(clientType: AuthClientType = 'USER_WEB') {
  return request<UserMe>('/auth/me', { authClientType: clientType })
}

export function applyLogin(
  res: LoginResponse,
  persistOrClientType: boolean | AuthClientType = true,
  maybeClientType?: AuthClientType,
) {
  const clientType =
    typeof persistOrClientType === 'string'
      ? persistOrClientType
      : maybeClientType || res.clientType || 'USER_WEB'
  setAuthToken(res.accessToken || res.token, clientType)
  setAuthUser(
    {
      userId: res.userId,
      username: res.username,
      displayName: res.displayName,
      role: res.role,
      status: res.status,
      creditBalance: res.creditBalance,
      creditFrozenBalance: res.creditFrozenBalance,
      creditTotalConsumed: res.creditTotalConsumed,
    },
    clientType,
  )
}

export function clearLogin(clientType: AuthClientType = 'USER_WEB') {
  clearAuthSession(clientType)
}

export { clearAuthUser, getAuthUser, setAuthUser }
