import { request, setAuthToken } from './request'
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

export function applyLogin(res: LoginResponse) {
  setAuthToken(res.token)
}

export function clearLogin() {
  setAuthToken(null)
}

