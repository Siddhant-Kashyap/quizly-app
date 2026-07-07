import { useEffect } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { Users } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { useMatchmaking } from '@/features/quiz/hooks/useMatchmaking'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { api } from '@/shared/lib/api'
import { PublicUserProfile } from '@/shared/types'

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(0.6)
  const opacity = useSharedValue(0.6)

  useEffect(() => {
    scale.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
    opacity.value = withRepeat(withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.iris },
        style,
      ]}
    />
  )
}

export default function Matchmaking() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const { user } = useAuth()
  const { status, match, error, cancel } = useMatchmaking(topic, user?.id ?? null)

  useEffect(() => {
    if (status !== 'matched' || !match) return
    let cancelled = false
    api.get<PublicUserProfile>(`/users/${match.opponentId}/public-profile`)
      .then((profile) => {
        if (cancelled) return
        router.replace(
          `/(quiz)/${topic}?mode=pvp&sessionId=${match.sessionId}&opponentId=${match.opponentId}` +
          `&opponentName=${encodeURIComponent(profile.username)}&wsUrl=${encodeURIComponent(match.wsUrl)}`,
        )
      })
    return () => { cancelled = true }
  }, [status, match, topic])

  const handleCancel = () => {
    cancel()
    router.back()
  }

  return (
    <View className="flex-1 bg-void items-center justify-center px-8">
      <View className="items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
        <PulseRing delay={0} size={140} />
        <PulseRing delay={400} size={100} />
        <View className="rounded-full bg-surface2 items-center justify-center" style={{ width: 72, height: 72 }}>
          <Users size={30} color={colors.iris} />
        </View>
      </View>

      <Text variant="title" className="text-white mb-2">
        {status === 'error' ? 'Something went wrong' : 'Finding an opponent…'}
      </Text>
      <Text variant="body" className="text-white/50 text-center mb-10">
        {status === 'error'
          ? (error ?? 'Could not connect to matchmaking. Please try again.')
          : 'Matching you with a random player for a head-to-head battle.'}
      </Text>

      <Button label={status === 'error' ? 'Back' : 'Cancel'} variant="ghost" onPress={handleCancel} />
    </View>
  )
}
