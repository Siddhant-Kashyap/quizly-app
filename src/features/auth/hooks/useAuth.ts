import AsyncStorage from '@react-native-async-storage/async-storage'
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

  // Guest→Google merge: reuses the same native Google Sign-In step as
  // signInWithGoogle, but exchanges the ID token via /auth/merge instead of
  // /auth/google, so the guest's progress carries over instead of starting
  // a fresh empty account. Only ever called from a guest session's limit
  // wall (see GuestLimitWall.tsx, added in a later task) — falls back to a
  // plain /auth/google call if there's somehow no guestId in the store,
  // which keeps this safe to call generally even though that shouldn't
  // happen given the call site.
  const mergeGuestIntoGoogle = async (): Promise<boolean> => {
    const idToken = await signInWithGoogleNative()
    if (!idToken) return false
    const guestId = useAuthStore.getState().guestId
    if (!guestId) {
      console.warn('mergeGuestIntoGoogle called with no guestId in the store — falling back to a plain Google login. This should not happen: guestId should only be missing if isGuest is also false.')
    }
    const response = guestId
      ? await api.post<AuthResponse>('/auth/merge', { guestId, idToken })
      : await api.post<AuthResponse>('/auth/google', { idToken })
    store.login(response.user, response.jwt)
    useProfileStore.getState().clearProfile() // fresh (possibly merged) account — refetch, don't show stale guest data
    // Best-effort cleanup: this is non-essential bookkeeping, so a failure here must not
    // undo or misrepresent the already-successful auth state change above.
    await AsyncStorage.removeItem('factora.guestCardsViewed').catch(() => {}) // fresh account, no more guest caps
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

  return { ...store, loginWithGoogle, signInWithGoogle, mergeGuestIntoGoogle, loginAsGuest, logout }
}
