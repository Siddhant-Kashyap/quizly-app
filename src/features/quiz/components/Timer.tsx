import React, { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'

interface Props {
  duration: number
  isPaused?: boolean
  onExpire: () => void
}

export function Timer({ duration, isPaused = false, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(duration)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setSecondsLeft(duration)
  }, [duration])

  useEffect(() => {
    if (isPaused) return
    if (secondsLeft <= 0) {
      onExpireRef.current()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, isPaused])

  const pct = Math.max(0, secondsLeft / duration)
  const barColor = pct > 0.4 ? colors.cyan : pct > 0.15 ? colors.gold : colors.fuchsia

  return (
    <View>
      <View className="h-1.5 bg-surface2 rounded-full overflow-hidden">
        <View style={{ width: `${pct * 100}%`, backgroundColor: barColor }} className="h-full rounded-full" />
      </View>
      <Text variant="caption" className="text-white/40 mt-1 text-right">{secondsLeft}s</Text>
    </View>
  )
}
