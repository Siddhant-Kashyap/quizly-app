import React from 'react'
import { View, ScrollView } from 'react-native'
import * as Icons from 'lucide-react-native'
import { Plus } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { Badge } from '@/shared/types'

export function BadgeRow({ badges, total }: { badges: Badge[]; total: number }) {
  return (
    <View>
      <Text variant="heading" className="text-white/60 mb-3">Badges · {badges.length} of {total}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {badges.map((badge) => {
          const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[badge.iconUrl] ?? Icons.Award
          return (
            <View key={badge.id} className="bg-surface2 rounded-2xl p-4 items-center border border-white/10" style={{ width: 88 }}>
              <Icon size={24} color={colors.gold} />
              <Text variant="caption" className="text-white text-center mt-2" numberOfLines={2}>{badge.name}</Text>
            </View>
          )
        })}
        <View className="rounded-2xl p-4 items-center justify-center border border-white/10" style={{ width: 88 }}>
          <Plus size={20} color={colors.muted} />
        </View>
      </ScrollView>
    </View>
  )
}
