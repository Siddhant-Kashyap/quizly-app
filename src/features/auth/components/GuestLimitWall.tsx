import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useAuth } from '../hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'
import { ApiError } from '@/shared/types'

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'status' in e && 'message' in e
}

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

export function GuestLimitWall({ feature, onSignedIn }: { feature: LimitFeature; onSignedIn?: () => void }) {
  const { mergeGuestIntoGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const copy = COPY[feature]

  const handleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const merged = await mergeGuestIntoGoogle()
      if (merged) {
        if (onSignedIn) onSignedIn()
        else router.replace('/(tabs)')
      }
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else if (isApiError(e)) setError(e.message || `Request failed (${e.status})`)
      else setError('Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
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

      <Button
        label={isLoading ? 'Signing in…' : 'Sign in with Google'}
        onPress={handleSignIn}
        disabled={isLoading}
      />
    </View>
  )
}
