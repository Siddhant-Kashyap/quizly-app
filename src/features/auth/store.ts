import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { User } from '@/shared/types'
import { setAuthToken, setGuestId } from '@/shared/lib/api'

interface AuthState {
  user: User | null
  isGuest: boolean
  token: string | null
  guestId: string | null
  hasHydrated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  continueAsGuest: (guestId: string) => void
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isGuest: false,
      token: null,
      guestId: null,
      hasHydrated: false,
      login: (user, token) => {
        setAuthToken(token)
        set({ user, token, isGuest: false, guestId: null })
      },
      logout: () => {
        setAuthToken(null)
        setGuestId(null)
        set({ user: null, token: null, isGuest: false, guestId: null })
      },
      continueAsGuest: (guestId) => {
        setGuestId(guestId)
        set({ isGuest: true, guestId })
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'quizly.auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Persisted state only restores the store's fields — api.ts's actual
      // Authorization/X-Guest-Id headers come from separate in-memory
      // module variables that only login()/continueAsGuest() set. Without
      // this, every JS reload silently drops auth: the store still looks
      // logged in, but every request goes out with no auth headers at all.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        setAuthToken(state.token)
        setGuestId(state.guestId)
        state.setHasHydrated(true)
      },
    },
  ),
)
