import React from 'react'
import { View } from 'react-native'
import { Flame, Target, Medal, Crown } from 'lucide-react-native'
import { Card, Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { UserProfile } from '@/shared/types'

function Stat({ icon: Icon, color, label, value }: { icon: typeof Flame; color: string; label: string; value: string }) {
  return (
    <Card className="flex-1 p-4">
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Icon size={16} color={color} />
        <Text variant="caption" className="text-white/50">{label}</Text>
      </View>
      <Text variant="title" className="text-white mt-2">{value}</Text>
    </Card>
  )
}

export function StatsGrid({ profile }: { profile: UserProfile }) {
  return (
    <View style={{ gap: 12 }}>
      <View className="flex-row" style={{ gap: 12 }}>
        <Stat icon={Flame} color={colors.ember} label="Streak" value={`${profile.streakDays} days`} />
        <Stat icon={Target} color={colors.cyan} label="Accuracy" value={`${Math.round(profile.accuracy * 100)}%`} />
      </View>
      <View className="flex-row" style={{ gap: 12 }}>
        <Stat icon={Crown} color={colors.iris} label="Level" value={`${profile.level}`} />
        <Stat icon={Medal} color={colors.gold} label="Rank" value={`#${profile.rank} global`} />
      </View>
    </View>
  )
}
