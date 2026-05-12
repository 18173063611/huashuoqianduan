export const AUTH_TOKEN_KEY = 'huashuo_token'
export const AUTH_USER_KEY = 'huashuo_user'

const LEGACY_AUTH_TOKEN_KEY = 'huashuo_auth_token'

export interface AuthUser {
  userId: number
  username: string
  displayName: string
  role?: 'USER' | 'ADMIN'
  status?: 'ENABLED' | 'DISABLED' | 'LOCKED'
  creditBalance?: number
}

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function setAuthToken(token: string | null) {
  if (!storageAvailable()) return
  try {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
      window.sessionStorage?.removeItem(LEGACY_AUTH_TOKEN_KEY)
      return
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
    window.sessionStorage?.removeItem(LEGACY_AUTH_TOKEN_KEY)
  } catch {
    return
  }
}

export function getAuthToken(): string | null {
  if (!storageAvailable()) return null
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (token?.trim()) return token.trim()

    const legacyToken =
      window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || window.sessionStorage?.getItem(LEGACY_AUTH_TOKEN_KEY)
    if (!legacyToken?.trim()) return null

    const migratedToken = legacyToken.trim()
    setAuthToken(migratedToken)
    return migratedToken
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser | null) {
  if (!storageAvailable()) return
  try {
    if (!user) {
      window.localStorage.removeItem(AUTH_USER_KEY)
      return
    }
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch {
    return
  }
}

export function getAuthUser(): AuthUser | null {
  if (!storageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function clearAuthUser() {
  setAuthUser(null)
}

export function clearAuthSession() {
  setAuthToken(null)
  clearAuthUser()
}
