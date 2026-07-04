import React from 'react'
import { View, Pressable } from 'react-native'
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { useFeedStore } from '../store'
import { FactCard } from '@/shared/types'

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${n}`
}

export function CardActions({ card }: { card: FactCard }) {
  const { likedCardIds, savedCardIds, likeCard, saveCard, unsaveCard } = useFeedStore()
  const isLiked = likedCardIds.includes(card.id)
  const isSaved = savedCardIds.includes(card.id)

  return (
    <View style={{ gap: 22 }} className="items-center">
      <Pressable onPress={() => !isLiked && likeCard(card.id)} className="items-center" style={{ gap: 4 }}>
        <View className="bg-surface2 rounded-full items-center justify-center" style={{ width: 44, height: 44 }}>
          <Heart size={20} color={isLiked ? colors.fuchsia : colors.white} fill={isLiked ? colors.fuchsia : 'transparent'} />
        </View>
        <Text variant="caption" className="text-white/70">{formatCount(card.likes + (isLiked ? 1 : 0))}</Text>
      </Pressable>

      <Pressable className="items-center" style={{ gap: 4 }}>
        <View className="bg-surface2 rounded-full items-center justify-center" style={{ width: 44, height: 44 }}>
          <MessageCircle size={20} color={colors.white} />
        </View>
        <Text variant="caption" className="text-white/70">{Math.max(1, Math.round(card.likes / 12))}</Text>
      </Pressable>

      <Pressable onPress={() => (isSaved ? unsaveCard(card.id) : saveCard(card.id))} className="items-center" style={{ gap: 4 }}>
        <View className="bg-surface2 rounded-full items-center justify-center" style={{ width: 44, height: 44 }}>
          <Bookmark size={20} color={isSaved ? colors.gold : colors.white} fill={isSaved ? colors.gold : 'transparent'} />
        </View>
        <Text variant="caption" className="text-white/70">Save</Text>
      </Pressable>

      <Pressable className="items-center" style={{ gap: 4 }}>
        <View className="bg-surface2 rounded-full items-center justify-center" style={{ width: 44, height: 44 }}>
          <Share2 size={20} color={colors.white} />
        </View>
      </Pressable>
    </View>
  )
}
