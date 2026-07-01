import { View } from 'react-native'
import { Text, Button } from '@/shared/components'

export default function Login() {
  return (
    <View className="flex-1 bg-void items-center justify-center px-6">
      <Text variant="title" className="text-white mb-8">Sign in to Quizly</Text>
      <Button label="Continue with Google" />
    </View>
  )
}
