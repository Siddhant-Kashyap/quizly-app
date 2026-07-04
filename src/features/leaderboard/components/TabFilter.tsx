import React from 'react'
import { View, Pressable } from 'react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { Period } from '../hooks/useLeaderboard'

const OPTIONS: { key: Period; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All-time' },
]

export function TabFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View className="flex-row bg-surface2 rounded-full p-1">
      {OPTIONS.map((opt) => {
        const isActive = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            className="flex-1 rounded-full py-2 items-center"
            style={{ backgroundColor: isActive ? colors.cyan : 'transparent' }}
          >
            <Text variant="heading" style={{ color: isActive ? colors.void : colors.white }}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
