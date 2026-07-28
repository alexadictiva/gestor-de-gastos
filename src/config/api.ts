const DEFAULT_API_URL = 'http://localhost:4000/api'

function buildApiUrl(rawApiUrl?: string) {
  const trimmedApiUrl = rawApiUrl?.trim()

  if (!trimmedApiUrl) {
    return DEFAULT_API_URL
  }

  const normalizedApiUrl = trimmedApiUrl.replace(/\/+$/, '')

  if (normalizedApiUrl.endsWith('/api')) {
    return normalizedApiUrl
  }

  return `${normalizedApiUrl}/api`
}

export const API_URL = buildApiUrl(import.meta.env.VITE_API_URL)
