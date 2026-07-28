const LOCAL_API_URL = 'http://localhost:4000/api'

function buildApiUrl(rawApiUrl?: string) {
  const trimmedApiUrl = rawApiUrl?.trim()

  if (!trimmedApiUrl) {
    return null
  }

  const normalizedApiUrl = trimmedApiUrl.replace(/\/+$/, '')

  if (normalizedApiUrl.endsWith('/api')) {
    return normalizedApiUrl
  }

  return `${normalizedApiUrl}/api`
}

function resolveApiUrl() {
  const configuredApiUrl = buildApiUrl(import.meta.env.VITE_API_URL)

  if (configuredApiUrl) {
    return configuredApiUrl
  }

  if (import.meta.env.DEV) {
    return LOCAL_API_URL
  }

  console.warn(
    'VITE_API_URL no esta configurada en produccion. Usando /api como fallback.'
  )

  return '/api'
}

export const API_URL = resolveApiUrl()
