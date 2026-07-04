import React from 'react'
import { View } from 'react-native'
import { Text, Avatar, Card } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { LeaderboardEntry } from '@/shared/lib/mockData'

export function RankList({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {entries.map((entry) => {
        const isMe = entry.userId === currentUserId
        return (
          <Card
            key={entry.userId}
            className="flex-row items-center px-4 py-3"
            style={isMe ? { borderColor: colors.cyan } : undefined}
          >
            <Text variant="heading" className="text-white/40 w-8">{entry.rank}</Text>
            <Avatar name={entry.username} size={32} />
            <Text variant="heading" className="text-white ml-3 flex-1">{entry.username}</Text>
            <Text variant="heading" style={{ color: isMe ? colors.cyan : colors.muted }}>{entry.xp.toLocaleString()}</Text>
          </Card>
        )
      })}
    </View>
  )
}
