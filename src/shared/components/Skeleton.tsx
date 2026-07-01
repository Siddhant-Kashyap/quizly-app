import React, { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'

interface Props {
  width?: number | string
  height?: number
  className?: string
}

export function Skeleton({ width = '100%', height = 16, className = '' }: Props) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ['#0D0D1A', '#A855F7', '#0D0D1A'],
    ),
  }))

  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius: 8 }, animatedStyle]}
      className={className}
    />
  )
}
