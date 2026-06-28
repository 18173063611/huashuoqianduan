export type AuthClientType = 'USER_WEB' | 'ADMIN_WEB'

export const USER_AUTH_TOKEN_KEY = 'huashuo_user_access_token'
export const ADMIN_AUTH_TOKEN_KEY = 'huashuo_admin_access_token'
export const AUTH_TOKEN_KEY = USER_AUTH_TOKEN_KEY

export const USER_AUTH_USER_KEY = 'huashuo_user'
export const ADMIN_AUTH_USER_KEY = 'huashuo_admin_user'
export const AUTH_USER_KEY = USER_AUTH_USER_KEY

const LEGACY_AUTH_TOKEN_KEYS = ['huashuo_token', 'huashuo_auth_token']

export interface AuthUser {
  userId: number
  username: string
  displayName: string
  avatarUrl?: string | null
  role?: 'USER' | 'ADMIN'
  status?: 'ENABLED' | 'DISABLED' | 'LOCKED'
  phone?: string | null
  email?: string | null
  remark?: string | null
  creditBalance?: number
  creditFrozenBalance?: number
  creditTotalConsumed?: number
}

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function tokenKey(clientType: AuthClientType) {
  return clientType === 'ADMIN_WEB' ? ADMIN_AUTH_TOKEN_KEY : USER_AUTH_TOKEN_KEY
}

function userKey(clientType: AuthClientType) {
  return clientType === 'ADMIN_WEB' ? ADMIN_AUTH_USER_KEY : USER_AUTH_USER_KEY
}

export function setAuthToken(token: string | null, clientType: AuthClientType = 'USER_WEB') {
  if (!storageAvailable()) return
  try {
    if (!token) {
      window.localStorage.removeItem(tokenKey(clientType))
      if (clientType === 'USER_WEB') {
        for (const key of LEGACY_AUTH_TOKEN_KEYS) {
          window.localStorage.removeItem(key)
          window.sessionStorage?.removeItem(key)
        }
      }
      return
    }
    window.localStorage.setItem(tokenKey(clientType), token)
    if (clientType === 'USER_WEB') {
      for (const key of LEGACY_AUTH_TOKEN_KEYS) {
        window.localStorage.removeItem(key)
        window.sessionStorage?.removeItem(key)
      }
    }
  } catch {
    return
  }
}

export function getAuthToken(clientType: AuthClientType = 'USER_WEB'): string | null {
  if (!storageAvailable()) return null
  try {
    const token = window.localStorage.getItem(tokenKey(clientType))
    if (token?.trim()) return token.trim()

    if (clientType === 'ADMIN_WEB') return null

    for (const key of LEGACY_AUTH_TOKEN_KEYS) {
      const legacyToken = window.localStorage.getItem(key) || window.sessionStorage?.getItem(key)
      if (!legacyToken?.trim()) continue
      const migratedToken = legacyToken.trim()
      setAuthToken(migratedToken, 'USER_WEB')
      return migratedToken
    }
    return null
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser | null, clientType: AuthClientType = 'USER_WEB') {
  if (!storageAvailable()) return
  try {
    if (!user) {
      window.localStorage.removeItem(userKey(clientType))
      return
    }
    window.localStorage.setItem(userKey(clientType), JSON.stringify(user))
  } catch {
    return
  }
}

export function getAuthUser(clientType: AuthClientType = 'USER_WEB'): AuthUser | null {
  if (!storageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(userKey(clientType))
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    window.localStorage.removeItem(userKey(clientType))
    return null
  }
}

export function clearAuthUser(clientType: AuthClientType = 'USER_WEB') {
  setAuthUser(null, clientType)
}

export function clearAuthSession(clientType: AuthClientType = 'USER_WEB') {
  setAuthToken(null, clientType)
  clearAuthUser(clientType)
}
