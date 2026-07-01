import { useRef } from 'react'
import { Animated } from 'react-native'

export function useAnimation() {
  const opacity = useRef(new Animated.Value(1)).current
  const fadeIn = () => Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
  const fadeOut = () => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start()
  return { opacity, fadeIn, fadeOut }
}
