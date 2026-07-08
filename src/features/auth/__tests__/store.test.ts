import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useAuthStore } from '../store'

beforeEach(() => {
  useAuthStore.setState({ user: null, isGuest: false, token: null, guestId: null })
})

test('continueAsGuest sets isGuest and guestId', () => {
  const { result } = renderHook(() => useAuthStore())
  act(() => result.current.continueAsGuest('guest-123'))
  expect(result.current.isGuest).toBe(true)
  expect(result.current.guestId).toBe('guest-123')
})

test('logout clears all auth state', () => {
  const { result } = renderHook(() => useAuthStore())
  act(() => result.current.continueAsGuest('guest-123'))
  act(() => result.current.logout())
  expect(result.current.isGuest).toBe(false)
  expect(result.current.guestId).toBeNull()
})

test('setHasHydrated updates hasHydrated', async () => {
  const { result } = renderHook(() => useAuthStore())
  act(() => result.current.setHasHydrated(true))
  await waitFor(() => expect(result.current.hasHydrated).toBe(true))
  act(() => result.current.setHasHydrated(false))
  await waitFor(() => expect(result.current.hasHydrated).toBe(false))
})
