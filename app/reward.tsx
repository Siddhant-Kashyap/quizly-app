import { View } from 'react-native'
import { Text, Button } from '@/shared/components'
import { router } from 'expo-router'
export default function Reward() {
  return (
    <View className="flex-1 bg-black/70 items-center justify-center px-6">
      <View className="bg-surface2 rounded-3xl p-8 items-center w-full">
        <Text variant="display" className="text-gold mb-2">🏆</Text>
        <Text variant="title" className="text-white mb-6">Achievement Unlocked!</Text>
        <Button label="Keep scrolling" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  )
}
