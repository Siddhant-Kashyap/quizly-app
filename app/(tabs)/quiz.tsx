import { View, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Zap, Swords } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { MOCK_TOPICS } from '@/shared/lib/mockData'
import { colors, ColorToken, gradients } from '@/shared/theme/colors'

export default function QuizHub() {
  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <Text variant="display" className="text-white mb-1">Quiz Hub</Text>
      <Text variant="body" className="text-white/50 mb-6">Play solo at your pace, or battle a random opponent.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push('/(quiz)/matchmaking?topic=all')}>
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
          onPress={() => router.push('/(quiz)/all')}
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
        {MOCK_TOPICS.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => router.push(`/(quiz)/${topic.slug}`)}
            className="bg-surface2 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
          >
            <Text variant="heading" style={{ color: colors[topic.color as ColorToken] }}>{topic.label}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
