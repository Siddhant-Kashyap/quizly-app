import { useMemo, useState } from 'react'
import { View, ScrollView, TextInput, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Search, LayoutGrid } from 'lucide-react-native'
import { Text, Skeleton } from '@/shared/components'
import { CategoryCard } from '@/features/explore/components/CategoryCard'
import { useCategories } from '@/features/explore/hooks/useCategories'
import { useFeed } from '@/features/feed/hooks/useFeed'
import { colors } from '@/shared/theme/colors'

export default function Explore() {
  const { topics, isLoading } = useCategories()
  const { currentTopic, fetchCards } = useFeed()
  const [query, setQuery] = useState('')

  const filteredTopics = useMemo(
    () => topics.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase())),
    [topics, query],
  )

  const handleSelect = async (slug: string) => {
    await fetchCards(slug)
    router.push('/(tabs)')
  }

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <Text variant="display" className="text-white mb-1">Explore</Text>
      <Text variant="body" className="text-white/50 mb-4">Pick what fascinates you</Text>

      <View className="flex-row items-center bg-surface2 rounded-2xl px-4 mb-6" style={{ gap: 8 }}>
        <Search size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics"
          placeholderTextColor={colors.muted}
          className="flex-1 text-white py-3"
        />
      </View>

      <Pressable
        onPress={() => handleSelect('all')}
        className="flex-row items-center rounded-2xl px-4 py-3 mb-4"
        style={{ gap: 10, backgroundColor: currentTopic === 'all' ? `${colors.cyan}22` : colors.surface2, borderWidth: 1, borderColor: currentTopic === 'all' ? colors.cyan : 'rgba(255,255,255,0.08)' }}
      >
        <LayoutGrid size={18} color={currentTopic === 'all' ? colors.cyan : colors.white} />
        <Text variant="heading" style={{ color: currentTopic === 'all' ? colors.cyan : colors.white }}>All Topics</Text>
      </Pressable>

      {isLoading ? (
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={150} width="47%" className="rounded-2xl" />
          ))}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {filteredTopics.map((topic) => (
              <CategoryCard key={topic.slug} topic={topic} onPress={() => handleSelect(topic.slug)} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}
