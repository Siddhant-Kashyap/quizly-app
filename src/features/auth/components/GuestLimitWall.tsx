import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useAuth } from '../hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

type LimitFeature = 'solo' | 'pvp' | 'cards'

const COPY: Record<LimitFeature, { title: string; body: string }> = {
  solo: {
    title: "You've played 5 free quizzes",
    body: 'Sign in with Google to keep playing and save your progress.',
  },
  pvp: {
    title: "You've used your free PvP match",
    body: 'Sign in with Google to battle more opponents and save your progress.',
  },
  cards: {
    title: "You've seen 10 free cards",
    body: 'Sign in with Google to keep exploring and save your progress.',
  },
}

export function GuestLimitWall({ feature }: { feature: LimitFeature }) {
  const { mergeGuestIntoGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const copy = COPY[feature]

  const handleSignIn = async () => {
    setError(null)
    try {
      const merged = await mergeGuestIntoGoogle()
      if (merged) router.replace('/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')
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
        <Lock size={32} color={colors.white} />
      </LinearGradient>
      <Text variant="display" className="text-cyan mb-2 text-center">{copy.title}</Text>
      <Text variant="body" className="text-white/60 text-center mb-12">{copy.body}</Text>

      {error && (
        <Text variant="caption" className="text-red-400 text-center mb-4">{error}</Text>
      )}

      <Button label="Sign in with Google" onPress={handleSignIn} />
    </View>
  )
}
