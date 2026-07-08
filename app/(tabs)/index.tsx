import { useEffect, useRef, useState } from 'react'
import { View, Pressable, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import { Skeleton, Text } from '@/shared/components'
import { FactCard } from '@/features/feed/components/FactCard'
import { useFeed } from '@/features/feed/hooks/useFeed'
import { useGuestCardLimit } from '@/features/feed/hooks/useGuestCardLimit'
import { useCategories } from '@/features/explore/hooks/useCategories'
import { GuestLimitWall } from '@/features/auth/components/GuestLimitWall'
import { FactCard as FactCardType } from '@/shared/types'
import { colors } from '@/shared/theme/colors'

export default function Home() {
  const { cards, currentTopic, isLoading, fetchCards } = useFeed()
  const { topics } = useCategories()
  const { isBlocked, isReady, recordView } = useGuestCardLimit()
  const [containerHeight, setContainerHeight] = useState(0)
  const { height } = useWindowDimensions()
  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: FactCardType }[] }) => {
      viewableItems.forEach((vi) => recordView(vi.item.id))
    },
  ).current
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 90, minimumViewTime: 300 }).current

  useEffect(() => {
    if (isReady && !isBlocked) fetchCards(currentTopic)
  }, [currentTopic, isReady, isBlocked])

  const pageHeight = containerHeight || height
  const activeTopic = topics.find((t) => t.slug === currentTopic)

  if (isReady && isBlocked) {
    return <GuestLimitWall feature="cards" />
  }

  return (
    <View
      className="flex-1 bg-void"
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {activeTopic && (
        <Pressable
          onPress={() => fetchCards('all')}
          className="absolute self-center flex-row items-center rounded-full px-4 py-2 bg-void/80 border border-white/15"
          style={{ top: 56, zIndex: 10, gap: 6 }}
        >
          <Text variant="caption" className="text-white">{activeTopic.label}</Text>
          <X size={12} color={colors.white} />
        </Pressable>
      )}

      {!isReady || isLoading || containerHeight === 0 ? (
        <View className="flex-1 justify-center px-6" style={{ gap: 16 }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={120} />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="40%" />
        </View>
      ) : (
        <Animated.FlatList<FactCardType>
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: { item: FactCardType; index: number }) => (
            <View style={{ height: pageHeight }}>
              <FactCard card={item} topics={topics} progress={(index + 1) / cards.length} index={index} scrollY={scrollY} pageHeight={pageHeight} />
            </View>
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        />
      )}
    </View>
  )
}
