import { useAuthStore } from '../store'
import { useProfileStore } from '@/features/profile/store'
import { api } from '@/shared/lib/api'
import { AuthResponse } from '@/shared/types'
import { signInWithGoogle as signInWithGoogleNative } from '../lib/googleSignIn'

function generateGuestId() {
  return `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function useAuth() {
  const store = useAuthStore()

  const loginWithGoogle = async (idToken: string) => {
    const response = await api.post<AuthResponse>('/auth/google', { idToken })
    store.login(response.user, response.jwt)
  }

  // Full flow: native Google account picker, then exchange the resulting ID
  // token with the backend. Resolves to false (no-op) if the user cancelled
  // the picker, true on a successful login.
  const signInWithGoogle = async (): Promise<boolean> => {
    const idToken = await signInWithGoogleNative()
    if (!idToken) return false
    await loginWithGoogle(idToken)
    return true
  }

  const loginAsGuest = async (guestId: string = generateGuestId()) => {
    const response = await api.post<AuthResponse>('/auth/guest', { guestId })
    store.login(response.user, response.jwt)
    store.continueAsGuest(guestId)
  }

  const logout = () => {
    store.logout()
    useProfileStore.getState().clearProfile()
  }

  return { ...store, loginWithGoogle, signInWithGoogle, loginAsGuest, logout }
}
