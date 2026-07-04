import React from 'react'
import { Pressable } from 'react-native'
import * as Icons from 'lucide-react-native'
import { Text } from '@/shared/components'
import { colors, ColorToken } from '@/shared/theme/colors'
import { Topic } from '@/shared/lib/mockData'

export function CategoryCard({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[topic.icon]
  const tint = colors[topic.color as ColorToken]

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-4 justify-between"
      style={{ width: '47%', aspectRatio: 1, backgroundColor: `${tint}40`, borderWidth: 1, borderColor: `${tint}66` }}
    >
      <Icon size={26} color={colors.white} />
      <Text variant="heading" className="text-white">{topic.label}</Text>
      <Text variant="caption" className="text-white/60">{topic.cardCount} cards</Text>
    </Pressable>
  )
}
