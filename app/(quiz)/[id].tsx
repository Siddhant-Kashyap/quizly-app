import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '@/shared/components'
export default function QuizPlay() {
  const { id } = useLocalSearchParams()
  return (
    <View className="flex-1 bg-void items-center justify-center">
      <Text variant="title" className="text-white">Quiz: {id}</Text>
    </View>
  )
}
