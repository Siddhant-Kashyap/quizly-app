import React from 'react'
import { View, Pressable } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { colors } from '@/shared/theme/colors'

export type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect'

const STYLES: Record<AnswerState, { border: string; bg: string; text: string; badgeBg: string; badgeText: string }> = {
  default:   { border: 'rgba(255,255,255,0.12)', bg: 'transparent', text: colors.white, badgeBg: colors.surface2, badgeText: colors.white },
  selected:  { border: colors.iris, bg: `${colors.iris}22`, text: colors.white, badgeBg: colors.iris, badgeText: colors.white },
  correct:   { border: colors.cyan, bg: `${colors.cyan}22`, text: colors.cyan, badgeBg: colors.cyan, badgeText: colors.void },
  incorrect: { border: colors.fuchsia, bg: `${colors.fuchsia}22`, text: colors.fuchsia, badgeBg: colors.fuchsia, badgeText: colors.white },
}

export function AnswerOption({
  label,
  letter,
  state = 'default',
  disabled = false,
  onPress,
}: {
  label: string
  letter: string
  state?: AnswerState
  disabled?: boolean
  onPress: () => void
}) {
  const s = STYLES[state]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center rounded-2xl px-4 py-4 mb-3"
      style={{ borderWidth: 1.5, borderColor: s.border, backgroundColor: s.bg, gap: 12 }}
    >
      <View className="rounded-full items-center justify-center" style={{ width: 28, height: 28, backgroundColor: s.badgeBg }}>
        <Text variant="caption" style={{ color: s.badgeText }}>{letter}</Text>
      </View>
      <Text variant="heading" style={{ color: s.text, flex: 1 }}>{label}</Text>
      {state === 'correct' && <Check size={18} color={colors.cyan} />}
      {state === 'incorrect' && <X size={18} color={colors.fuchsia} />}
    </Pressable>
  )
}
