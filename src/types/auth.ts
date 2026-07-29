export interface AuthUser {
  id: string
  name: string
  email: string
  createdAt: string
  telegramConnected?: boolean
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

export interface ForgotPasswordResponse {
  ok: boolean
  message: string
  delivery: 'email' | 'console'
}

export interface UpdateProfileResponse {
  ok: boolean
  message: string
  token: string
  user: AuthUser
}

export interface TelegramLinkCodeResponse {
  ok: boolean
  message: string
  code: string
  expiresAt: string
  botUsername: string | null
}

export interface TelegramStatusResponse {
  ok: boolean
  configured: boolean
  botUsername: string | null
  message: string
}
