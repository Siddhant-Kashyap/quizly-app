import { renderHook, waitFor, act } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useGuestCardLimit, GUEST_CARDS_VIEWED_KEY } from '../useGuestCardLimit'
import { useAuthStore } from '@/features/auth/store'

beforeEach(async () => {
  await AsyncStorage.clear()
  useAuthStore.setState({ isGuest: true, hasHydrated: true })
})

test('is not blocked below the limit, and ignores non-guests entirely', async () => {
  useAuthStore.setState({ isGuest: false })
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 15; i++) result.current.recordView(`card-${i}`) })

  expect(result.current.isBlocked).toBe(false) // never blocked — not a guest
})

test('becomes blocked once a guest has viewed 10 distinct cards', async () => {
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 10; i++) result.current.recordView(`card-${i}`) })

  await waitFor(() => expect(result.current.isBlocked).toBe(true))
})

test('viewing the same card repeatedly only counts once', async () => {
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 20; i++) result.current.recordView('same-card') })

  expect(result.current.isBlocked).toBe(false)
})

test('persists the viewed count across a remount (AsyncStorage)', async () => {
  const first = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(first.result.current.isBlocked).toBe(false))
  act(() => { for (let i = 0; i < 10; i++) first.result.current.recordView(`card-${i}`) })
  await waitFor(() => expect(first.result.current.isBlocked).toBe(true))

  const second = renderHook(() => useGuestCardLimit())

  await waitFor(() => expect(second.result.current.isBlocked).toBe(true))
})

test('a recordView call that lands before the initial AsyncStorage load resolves does not lose either side\'s data', async () => {
  await AsyncStorage.setItem(GUEST_CARDS_VIEWED_KEY, JSON.stringify(['old-card-1', 'old-card-2']))
  const { result } = renderHook(() => useGuestCardLimit())

  // Call recordView synchronously, before the mount effect's AsyncStorage.getItem has resolved.
  act(() => { result.current.recordView('new-card') })

  // Once everything settles, both the pre-existing disk history AND the
  // new view recorded before the load finished must both be present.
  await waitFor(async () => {
    const raw = await AsyncStorage.getItem(GUEST_CARDS_VIEWED_KEY)
    const stored = JSON.parse(raw ?? '[]')
    expect(stored).toEqual(expect.arrayContaining(['old-card-1', 'old-card-2', 'new-card']))
  })
})

test('isReady is false until both auth hydration and the initial AsyncStorage load complete', async () => {
  useAuthStore.setState({ isGuest: true, hasHydrated: false })
  const { result } = renderHook(() => useGuestCardLimit())

  expect(result.current.isReady).toBe(false)

  act(() => { useAuthStore.setState({ hasHydrated: true }) })
  await waitFor(() => expect(result.current.isReady).toBe(true))
})
