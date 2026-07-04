import { useState } from 'react'
import { View, ScrollView } from 'react-native'
import { Text, Skeleton } from '@/shared/components'
import { PodiumRow } from '@/features/leaderboard/components/PodiumRow'
import { RankList } from '@/features/leaderboard/components/RankList'
import { TabFilter } from '@/features/leaderboard/components/TabFilter'
import { useLeaderboard, Period } from '@/features/leaderboard/hooks/useLeaderboard'

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('weekly')
  const { entries, isLoading } = useLeaderboard(period)

  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <Text variant="display" className="text-white mb-6">Leaderboard</Text>

      <View className="mb-6">
        <TabFilter value={period} onChange={setPeriod} />
      </View>

      {isLoading ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={140} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <PodiumRow entries={podium} />
          <RankList entries={rest} currentUserId="guest" />
        </ScrollView>
      )}
    </View>
  )
}
