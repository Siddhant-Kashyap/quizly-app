import { useOnboardingStore } from '../store'

export function useOnboarding() {
  const { hasCompleted, selectedTopics, completeOnboarding, toggleTopic } = useOnboardingStore()
  return { hasCompleted, selectedTopics, completeOnboarding, toggleTopic }
}
