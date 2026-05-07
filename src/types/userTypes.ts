export interface UserMe {
  userId: number
  username: string
  displayName: string
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

