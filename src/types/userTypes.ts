export type UserRole = 'USER' | 'ADMIN'
export type UserStatus = 'ENABLED' | 'DISABLED' | 'LOCKED'

export interface UserMe {
  userId: number
  username: string
  displayName: string
  role?: UserRole
  status?: UserStatus
  creditBalance?: number
  creditFrozenBalance?: number
  creditTotalConsumed?: number
}

export interface LoginResponse extends UserMe {
  token: string
  expiresAt: string
}

export interface RegisterRequest {
  username: string
  password: string
  displayName?: string
}

export interface LoginRequest {
  username: string
  password: string
}
