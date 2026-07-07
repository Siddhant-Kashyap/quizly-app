import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Zap } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { GuestButton } from '@/features/auth/components/GuestButton'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'
import { ApiError } from '@/shared/types'

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'status' in e && 'message' in e
}

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    try {
      const signedIn = await signInWithGoogle()
      if (signedIn) router.replace('/(tabs)')
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else if (isApiError(e)) setError(e.message || `Request failed (${e.status})`)
      else setError('Google sign-in failed. Please try again.')
    }
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
      <Text variant="display" className="text-cyan mb-2">Factora</Text>
      <Text variant="body" className="text-white/60 text-center mb-12">
        Sign in to save your progress and climb the leaderboard.
      </Text>

      {error && (
        <Text variant="caption" className="text-red-400 text-center mb-4">{error}</Text>
      )}

      <View className="w-full" style={{ gap: 12 }}>
        <Button label="Continue with Google" onPress={handleGoogle} />
        <GuestButton />
      </View>
    </View>
  )
}
