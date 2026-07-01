import { Redirect } from 'expo-router'
import { useAuthStore } from '@/features/auth/store'
import { useOnboardingStore } from '@/features/onboarding/store'

export default function Index() {
  const { isGuest, user } = useAuthStore()
  const { hasCompleted } = useOnboardingStore()

  if (!hasCompleted) return <Redirect href="/(auth)/onboarding" />
  if (isGuest || user) return <Redirect href="/(tabs)" />
  return <Redirect href="/(auth)/onboarding" />
}
