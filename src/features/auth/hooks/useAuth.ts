import { useAuthStore } from '../store'
import { useProfileStore } from '@/features/profile/store'
import { MOCK_PROFILE, mockDelay } from '@/shared/lib/mockData'

function generateGuestId() {
  return `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function useAuth() {
  const store = useAuthStore()

  // NOTE: dummy-data mode — no backend calls yet. Swap these bodies for real
  // `api.post('/auth/google' | '/auth/guest', ...)` calls once the API is live.
  const loginWithGoogle = async (_idToken: string) => {
    await mockDelay(null, 300)
    store.login({ id: 'demo-user', username: 'Demo User', email: 'demo@quizly.app' }, 'mock-jwt')
    useProfileStore.getState().setProfile(MOCK_PROFILE)
  }

  const loginAsGuest = async (guestId: string = generateGuestId()) => {
    await mockDelay(null, 300)
    store.continueAsGuest(guestId)
    useProfileStore.getState().setProfile({ ...MOCK_PROFILE, userId: guestId })
  }

  const logout = () => {
    store.logout()
    useProfileStore.getState().clearProfile()
  }

  return { ...store, loginWithGoogle, loginAsGuest, logout }
}
