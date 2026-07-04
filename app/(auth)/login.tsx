import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Zap } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { GuestButton } from '@/features/auth/components/GuestButton'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

export default function Login() {
  const { loginWithGoogle } = useAuth()

  const handleGoogle = async () => {
    await loginWithGoogle('mock-id-token')
    router.replace('/(tabs)')
  }

  return (
    <View className="flex-1 bg-void items-center justify-center px-6">
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        <Zap size={32} color={colors.white} fill={colors.white} />
      </LinearGradient>
      <Text variant="display" className="text-cyan mb-2">Quizly</Text>
      <Text variant="body" className="text-white/60 text-center mb-12">
        Sign in to save your progress and climb the leaderboard.
      </Text>

      <View className="w-full" style={{ gap: 12 }}>
        <Button label="Continue with Google" onPress={handleGoogle} />
        <GuestButton />
      </View>
    </View>
  )
}
