import { api, setAuthToken } from '@/shared/lib/api'
import { useAuthStore } from '../store'

export function useAuth() {
  const store = useAuthStore()

  const loginWithGoogle = async (idToken: string) => {
    const { jwt, user } = await api.post<{ jwt: string; user: any }>('/auth/google', { idToken })
    store.login(user, jwt)
  }

  const loginAsGuest = async (guestId: string) => {
    const { jwt } = await api.post<{ jwt: string; user: any }>('/auth/guest', { guestId })
    setAuthToken(jwt)           // bearer token for subsequent requests
    store.continueAsGuest(guestId)
  }

  return { loginWithGoogle, loginAsGuest, logout: store.logout, ...store }
}
