import React from 'react'
import { View } from 'react-native'
import { Crown } from 'lucide-react-native'
import { Text, Avatar } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { LeaderboardEntry } from '@/shared/lib/mockData'

const PILLAR: Record<number, { bg: string; text: string }> = {
  1: { bg: colors.gold, text: colors.void },
  2: { bg: colors.surface2, text: colors.white },
  3: { bg: colors.ember, text: colors.white },
}
const HEIGHT: Record<number, number> = { 1: 100, 2: 72, 3: 56 }

function PodiumPillar({ entry }: { entry: LeaderboardEntry }) {
  const { bg, text } = PILLAR[entry.rank]
  return (
    <View className="items-center" style={{ width: 96 }}>
      {entry.rank === 1 && <Crown size={20} color={colors.gold} style={{ marginBottom: 4 }} />}
      <View style={entry.rank === 1 ? { borderWidth: 2, borderColor: colors.gold, borderRadius: 999 } : undefined}>
        <Avatar name={entry.username} size={entry.rank === 1 ? 56 : 44} />
      </View>
      <Text variant="heading" className="text-white mt-2" numberOfLines={1}>{entry.username}</Text>
      <Text variant="caption" className="text-white/40 mb-2">{entry.xp.toLocaleString()} XP</Text>
      <View
        className="w-full rounded-t-xl items-center justify-start pt-2"
        style={{ height: HEIGHT[entry.rank], backgroundColor: bg }}
      >
        <Text variant="title" style={{ color: text }}>{entry.rank}</Text>
      </View>
    </View>
  )
}

export function PodiumRow({ entries }: { entries: LeaderboardEntry[] }) {
  const [first, second, third] = entries
  if (!first || !second || !third) return null

  return (
    <View className="flex-row items-end justify-center mb-6" style={{ gap: 8 }}>
      <PodiumPillar entry={second} />
      <PodiumPillar entry={first} />
      <PodiumPillar entry={third} />
    </View>
  )
}
