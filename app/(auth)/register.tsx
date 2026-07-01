import { View } from 'react-native'
import { Text, Button } from '@/shared/components'

export default function Register() {
  return (
    <View className="flex-1 bg-void items-center justify-center px-6">
      <Text variant="title" className="text-white mb-8">Create your account</Text>
      <Button label="Sign up with Google" />
    </View>
  )
}
