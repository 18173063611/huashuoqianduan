import { request } from './request'
import {
  clearAuthSession,
  clearAuthUser,
  getAuthUser,
  setAuthToken,
  setAuthUser,
} from './authSession'
import type { LoginRequest, LoginResponse, RegisterRequest, UserMe } from '../types/userTypes'

export function register(payload: RegisterRequest) {
  return request<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' })
}

export function me() {
  return request<UserMe>('/auth/me')
}

export function applyLogin(res: LoginResponse, persist = true) {
  void persist
  setAuthToken(res.token)
  setAuthUser({
    userId: res.userId,
    username: res.username,
    displayName: res.displayName,
    role: res.role,
    status: res.status,
    creditBalance: res.creditBalance,
    creditFrozenBalance: res.creditFrozenBalance,
    creditTotalConsumed: res.creditTotalConsumed,
  })
}

export function clearLogin() {
  clearAuthSession()
}

export { clearAuthUser, getAuthUser, setAuthUser }
