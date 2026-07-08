import { renderHook } from '@testing-library/react-native'
import { useQuizEligibility } from '../useQuizEligibility'
import { api } from '@/shared/lib/api'

jest.mock('@/shared/lib/api', () => ({ api: { get: jest.fn() } }))

beforeEach(() => { jest.clearAllMocks() })

test('returns true when the backend says allowed', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ allowed: true })
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('solo')

  expect(allowed).toBe(true)
  expect(api.get).toHaveBeenCalledWith('/quiz/eligibility?mode=solo')
})

test('returns false when the backend says blocked', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ allowed: false })
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('p2p')

  expect(allowed).toBe(false)
  expect(api.get).toHaveBeenCalledWith('/quiz/eligibility?mode=p2p')
})

test('fails open (returns true) if the request itself throws', async () => {
  ;(api.get as jest.Mock).mockRejectedValue(new Error('network error'))
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('solo')

  expect(allowed).toBe(true)
})
