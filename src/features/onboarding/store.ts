import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface OnboardingState {
  selectedTopics: string[]
  hasCompleted: boolean
  toggleTopic: (topic: string) => void
  completeOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      selectedTopics: [],
      hasCompleted: false,
      toggleTopic: (topic) => {
        const topics = get().selectedTopics
        set({
          selectedTopics: topics.includes(topic)
            ? topics.filter((t) => t !== topic)
            : [...topics, topic],
        })
      },
      completeOnboarding: () => { set({ hasCompleted: true }) },
    }),
    {
      name: 'quizly.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
