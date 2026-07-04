import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Clock, Flame } from 'lucide-react-native'
import { Text, Avatar } from '@/shared/components'
import { colors, gradients, ColorToken } from '@/shared/theme/colors'
import { MOCK_TOPICS } from '@/shared/lib/mockData'
import { FactCard as FactCardType } from '@/shared/types'
import { useProfileStore } from '@/features/profile/store'
import { CardActions } from './CardActions'

function RingVisual({ tint }: { tint: string }) {
  return (
    <View className="items-center justify-center self-center my-6" style={{ width: 160, height: 160 }}>
      <View className="absolute rounded-full" style={{ width: 160, height: 160, borderWidth: 1.5, borderColor: `${tint}55` }} />
      <View className="absolute rounded-full" style={{ width: 116, height: 116, borderWidth: 1.5, borderColor: `${tint}88` }} />
      <View className="absolute rounded-full" style={{ width: 72, height: 72, borderWidth: 1.5, borderColor: tint }} />
      <View className="rounded-full" style={{ width: 20, height: 20, backgroundColor: colors.fuchsia, opacity: 0.9 }} />
    </View>
  )
}

interface Props {
  card: FactCardType
  progress: number
  index: number
  scrollY: SharedValue<number>
  pageHeight: number
}

export function FactCard({ card, progress, index, scrollY, pageHeight }: Props) {
  const topic = MOCK_TOPICS.find((t) => t.slug === card.topic)
  const tint = colors[(topic?.color ?? 'cyan') as ColorToken]
  const streakDays = useProfileStore((s) => s.profile?.streakDays ?? 0)

  const inputRange = [(index - 1) * pageHeight, index * pageHeight, (index + 1) * pageHeight]

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, inputRange, [-50, 0, 50], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP),
  }))

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, inputRange, [-24, 0, 24], Extrapolation.CLAMP) },
    ],
  }))

  return (
    <View className="flex-1 bg-surface1 pt-16 pb-8">
      <View className="flex-row justify-between items-center px-6">
        <View className="rounded-full px-3 py-1 border" style={{ backgroundColor: `${tint}1A`, borderColor: `${tint}55` }}>
          <Text variant="caption" style={{ color: tint }}>{topic?.label ?? card.topic}</Text>
        </View>
        <View className="rounded-full px-3 py-1 flex-row items-center bg-ember/20" style={{ gap: 4 }}>
          <Flame size={12} color={colors.ember} />
          <Text variant="caption" style={{ color: colors.ember }}>{streakDays}</Text>
        </View>
      </View>

      <Animated.View style={ringStyle}>
        <RingVisual tint={tint} />
      </Animated.View>

      <View className="flex-1 flex-row px-6">
        <Animated.View style={[{ flex: 1, paddingRight: 64 }, titleStyle]}>
          <Text variant="display" className="text-white mb-3">{card.title}</Text>
          <Text variant="body" className="text-white/60">{card.body}</Text>
        </Animated.View>
      </View>

      <View className="absolute right-4" style={{ bottom: 96 }}>
        <CardActions card={card} />
      </View>

      <View className="flex-row items-center px-6 mt-4" style={{ gap: 10 }}>
        <Avatar name={card.author} size={32} />
        <View>
          <Text variant="heading" className="text-white">@{card.author.toLowerCase().replace(/\s+/g, '')}</Text>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Clock size={12} color={colors.muted} />
            <Text variant="caption" className="text-white/40">{card.readTimeSeconds}s · {card.saves.toLocaleString()} saved</Text>
          </View>
        </View>
      </View>

      <View className="h-1 bg-surface2 mt-4 mx-6 rounded-full overflow-hidden">
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${progress * 100}%` }}
        />
      </View>
    </View>
  )
}
