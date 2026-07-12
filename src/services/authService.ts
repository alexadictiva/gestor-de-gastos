import type {
  ForgotPasswordResponse,
  LoginResponse,
  MeResponse,
  RegisterResponse,
  TelegramLinkCodeResponse,
  UpdateProfileResponse,
} from '../types/auth'

const API_URL = 'http://localhost:4000/api'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  name: string
  email: string
  password: string
}

interface ForgotPasswordPayload {
  email: string
}

interface UpdateProfilePayload {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

export async function loginRequest(
  payload: LoginPayload
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión')
  }

  return data
}

export async function registerRequest(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al registrar usuario')
  }

  return data
}

export async function meRequest(token: string): Promise<MeResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener usuario')
  }

  return data
}

export async function forgotPasswordRequest(
  payload: ForgotPasswordPayload
): Promise<ForgotPasswordResponse> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al recuperar contrasena')
  }

  return data
}

export async function updateProfileRequest(
  token: string,
  payload: UpdateProfilePayload
): Promise<UpdateProfileResponse> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar la cuenta')
  }

  return data
}

export async function generateTelegramLinkCodeRequest(
  token: string
): Promise<TelegramLinkCodeResponse> {
  const response = await fetch(`${API_URL}/auth/telegram/link-code`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al generar el codigo de Telegram')
  }

  return data
}

export async function unlinkTelegramRequest(
  token: string
): Promise<UpdateProfileResponse> {
  const response = await fetch(`${API_URL}/auth/telegram/link`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al desvincular Telegram')
  }

  return data
}
