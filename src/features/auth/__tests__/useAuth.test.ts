import { renderHook, act } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store'
import { useProfileStore } from '@/features/profile/store'
import { api } from '@/shared/lib/api'
import * as googleSignIn from '../lib/googleSignIn'

jest.mock('@/shared/lib/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
  setGuestId: jest.fn(),
}))
jest.mock('../lib/googleSignIn', () => ({ signInWithGoogle: jest.fn() }))

const mockUser = { id: 'google-user-1', username: 'Merged User', email: 'm@example.com', avatarUrl: null }

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ user: null, isGuest: true, token: 'old-guest-token', guestId: 'guest-abc' })
  useProfileStore.setState({ profile: null })
})

test('mergeGuestIntoGoogle posts /auth/merge with the current guestId and logs in on success', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())
  let merged: boolean = false
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(true)
  expect(api.post).toHaveBeenCalledWith('/auth/merge', { guestId: 'guest-abc', idToken: 'fake-id-token' })
  expect(useAuthStore.getState().isGuest).toBe(false)
  expect(useAuthStore.getState().user?.id).toBe('google-user-1')
})

test('mergeGuestIntoGoogle clears the profile store and the card-view counter on success', async () => {
  useProfileStore.setState({ profile: { userId: 'guest-abc' } as never })
  await AsyncStorage.setItem('factora.guestCardsViewed', JSON.stringify(['c1', 'c2']))
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())
  await act(async () => { await result.current.mergeGuestIntoGoogle() })

  expect(useProfileStore.getState().profile).toBeNull()
  expect(await AsyncStorage.getItem('factora.guestCardsViewed')).toBeNull()
})

test('mergeGuestIntoGoogle returns false without calling the API if the picker was cancelled', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue(null)

  const { result } = renderHook(() => useAuth())
  let merged: boolean = true
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(false)
  expect(api.post).not.toHaveBeenCalled()
})
