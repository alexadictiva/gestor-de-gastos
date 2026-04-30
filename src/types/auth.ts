export interface AuthUser {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface LoginResponse {
  ok: boolean
  message: string
  token: string
  user: AuthUser
}

export interface RegisterResponse {
  ok: boolean
  message: string
  user: AuthUser
}

export interface MeResponse {
  ok: boolean
  user: AuthUser
}