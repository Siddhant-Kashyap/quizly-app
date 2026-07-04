import React from 'react'
import { View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function StreakCalendar({ weeklyActivity, streakDays }: { weeklyActivity: boolean[]; streakDays: number }) {
  return (
    <View className="bg-surface2 rounded-2xl p-4 border border-white/10">
      <View className="flex-row items-center mb-4" style={{ gap: 6 }}>
        <Flame size={18} color={colors.ember} />
        <Text variant="heading" className="text-white">{streakDays}-day streak</Text>
      </View>
      <View className="flex-row justify-between">
        {weeklyActivity.map((active, i) => (
          <View key={i} className="items-center" style={{ gap: 6 }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                backgroundColor: active ? colors.ember : 'rgba(255,255,255,0.06)',
              }}
            >
              {active && <Flame size={14} color={colors.void} />}
            </View>
            <Text variant="caption" className="text-white/40">{DAY_LABELS[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
