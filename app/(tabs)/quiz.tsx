import { useState } from 'react'
import { View, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Zap, Swords } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { useCategories } from '@/features/explore/hooks/useCategories'
import { useQuizEligibility } from '@/features/quiz/hooks/useQuizEligibility'
import { TOPIC_COLORS, DEFAULT_TOPIC_COLOR } from '@/shared/lib/topicColors'
import { colors, gradients } from '@/shared/theme/colors'

export default function QuizHub() {
  const { topics } = useCategories()
  const checkEligibility = useQuizEligibility()
  const [isNavigating, setIsNavigating] = useState(false)

  const startPvp = async () => {
    if (isNavigating) return
    setIsNavigating(true)
    try {
      const allowed = await checkEligibility('p2p')
      router.push(allowed ? '/(quiz)/matchmaking?topic=all' : '/(quiz)/limit-wall?feature=pvp')
    } finally {
      setIsNavigating(false)
    }
  }

  const startSolo = async (topic: string) => {
    if (isNavigating) return
    setIsNavigating(true)
    try {
      const allowed = await checkEligibility('solo')
      router.push(allowed ? `/(quiz)/${topic}` : '/(quiz)/limit-wall?feature=solo')
    } finally {
      setIsNavigating(false)
    }
  }

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <Text variant="display" className="text-white mb-1">Quiz Hub</Text>
      <Text variant="body" className="text-white/50 mb-6">Play solo at your pace, or battle a random opponent.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={startPvp} disabled={isNavigating}>
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, padding: 20, marginBottom: 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <Swords size={24} color={colors.white} />
                <View>
                  <Text variant="heading" className="text-white">PvP Battle</Text>
                  <Text variant="caption" className="text-white/80">Random opponent · head to head</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.white} />
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => startSolo('all')}
          disabled={isNavigating}
          className="bg-iris/20 rounded-2xl p-5 mb-6 flex-row items-center justify-between"
          style={{ borderWidth: 1, borderColor: colors.iris }}
        >
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Zap size={22} color={colors.iris} />
            <View>
              <Text variant="heading" className="text-white">Mixed Quiz</Text>
              <Text variant="caption" className="text-white/50">6 random questions, all topics</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.white} />
        </Pressable>

        <Text variant="heading" className="text-white/60 mb-3">Solo by Topic</Text>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => startSolo(topic.slug)}
            disabled={isNavigating}
            className="bg-surface2 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
          >
            <Text variant="heading" style={{ color: colors[TOPIC_COLORS[topic.slug] ?? DEFAULT_TOPIC_COLOR] }}>{topic.label}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
