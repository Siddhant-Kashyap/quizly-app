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
  login: (user: User, token: string) => void
  logout: () => void
  continueAsGuest: (guestId: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isGuest: false,
      token: null,
      guestId: null,
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
    }),
    {
      name: 'quizly.auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
