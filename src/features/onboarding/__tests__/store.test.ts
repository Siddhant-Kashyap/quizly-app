import { act, renderHook } from '@testing-library/react-native'
import { useOnboardingStore } from '../store'

beforeEach(() => {
  useOnboardingStore.setState({ selectedTopics: [], hasCompleted: false })
})

test('toggleTopic adds a topic', () => {
  const { result } = renderHook(() => useOnboardingStore())
  act(() => result.current.toggleTopic('physics'))
  expect(result.current.selectedTopics).toContain('physics')
})

test('toggleTopic removes an already-selected topic', () => {
  const { result } = renderHook(() => useOnboardingStore())
  act(() => result.current.toggleTopic('physics'))
  act(() => result.current.toggleTopic('physics'))
  expect(result.current.selectedTopics).not.toContain('physics')
})

test('completeOnboarding sets hasCompleted', () => {
  const { result } = renderHook(() => useOnboardingStore())
  act(() => result.current.completeOnboarding())
  expect(result.current.hasCompleted).toBe(true)
})
