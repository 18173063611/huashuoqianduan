export type UserRole = 'USER' | 'ADMIN'
export type UserStatus = 'ENABLED' | 'DISABLED' | 'LOCKED'
export type AuthClientType = 'USER_WEB' | 'ADMIN_WEB'

export interface UserMe {
  userId: number
  username: string
  displayName: string
  avatarUrl?: string | null
  role?: UserRole
  status?: UserStatus
  phone?: string | null
  email?: string | null
  remark?: string | null
  permissions?: string[] | null
  features?: string[] | null
  creditBalance?: number
  creditFrozenBalance?: number
  creditTotalConsumed?: number
}

export interface LoginResponse extends UserMe {
  accessToken?: string
  token: string
  clientType?: AuthClientType
  sessionId?: string
  expiresAt: string
}

export interface RegisterRequest {
  username: string
  password: string
  displayName?: string
  key?: string
  clientType?: AuthClientType
  deviceId?: string
}

export interface LoginRequest {
  username: string
  password: string
  clientType?: AuthClientType
  deviceId?: string
}

export interface UserProfileUpdateRequest {
  displayName: string
  phone?: string | null
  email?: string | null
  remark?: string | null
}

export interface UserPasswordChangeRequest {
  currentPassword: string
  newPassword: string
}
