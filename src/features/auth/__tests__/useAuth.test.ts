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

test('mergeGuestIntoGoogle warns and falls back to /auth/google if there is no guestId in the store', async () => {
  useAuthStore.setState({ user: null, isGuest: false, token: null, guestId: null })
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())
  let merged: boolean = false
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(true)
  expect(api.post).toHaveBeenCalledWith('/auth/google', { idToken: 'fake-id-token' })
  expect(warnSpy).toHaveBeenCalled()
  warnSpy.mockRestore()
})

test('mergeGuestIntoGoogle does not log in if the /auth/merge call itself rejects', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockRejectedValue({ status: 400, message: 'Unknown guestId' })

  const { result } = renderHook(() => useAuth())
  await expect(result.current.mergeGuestIntoGoogle()).rejects.toBeTruthy()

  expect(useAuthStore.getState().isGuest).toBe(true) // unchanged — login() never ran
})

test('mergeGuestIntoGoogle reads guestId live, not a value captured at render time', async () => {
  let resolvePicker: (idToken: string) => void
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockReturnValue(
    new Promise<string>((resolve) => { resolvePicker = resolve }),
  )
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())

  let merged: boolean = false
  const mergePromise = act(async () => { merged = await result.current.mergeGuestIntoGoogle() })
  // Let mergeGuestIntoGoogle actually start running and suspend on the
  // `await signInWithGoogleNative()` call before we touch the store.
  await Promise.resolve()
  await Promise.resolve()
  // While the picker is still "open," something else changes the store's
  // guestId — e.g. a concurrent effect elsewhere in the app. A stale
  // closure read (captured before this happened) would still use the OLD
  // guestId; a live read picks up this new one.
  useAuthStore.setState({ guestId: 'guest-changed-mid-flow' })
  resolvePicker!('fake-id-token')
  await mergePromise

  expect(merged).toBe(true)
  expect(api.post).toHaveBeenCalledWith('/auth/merge', { guestId: 'guest-changed-mid-flow', idToken: 'fake-id-token' })
})

test('mergeGuestIntoGoogle does not reject if clearing the card-view counter fails', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })
  const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('storage full'))

  const { result } = renderHook(() => useAuth())
  let merged: boolean = false
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(true) // still succeeds — the user IS logged in
  expect(useAuthStore.getState().isGuest).toBe(false)
  removeItemSpy.mockRestore()
})
