import { View } from 'react-native'
import { Text } from '@/shared/components'
export default function Home() {
  return (
    <View className="flex-1 bg-void items-center justify-center">
      <Text variant="title" className="text-white">Home Feed</Text>
    </View>
  )
}
