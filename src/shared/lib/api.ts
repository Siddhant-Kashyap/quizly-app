import { ApiError } from '@/shared/types'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

let authToken: string | null = null
let guestId: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setGuestId(id: string | null) {
  guestId = id
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (guestId) headers['X-Guest-Id'] = guestId

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      status: res.status,
      message: res.statusText,
    }))
    throw error
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
