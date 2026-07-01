import { View } from 'react-native'
import { router } from 'expo-router'
import { Text, Button } from '@/shared/components'
import { useOnboardingStore } from '@/features/onboarding/store'
import { storage, STORAGE_KEYS } from '@/shared/lib/storage'

export default function Onboarding() {
  const { completeOnboarding } = useOnboardingStore()

  const handleComplete = async () => {
    completeOnboarding()
    await storage.set(STORAGE_KEYS.ONBOARDED, 'true')
    router.replace('/(tabs)')
  }

  return (
    <View className="flex-1 bg-void items-center justify-center px-6">
      <Text variant="display" className="text-cyan mb-4">Quizly</Text>
      <Text variant="body" className="text-white/60 text-center mb-8">
        Pick topics you love. Scroll. Learn. Compete.
      </Text>
      <Button label="Continue" onPress={handleComplete} />
    </View>
  )
}
