import React from 'react'
import { Pressable, PressableProps } from 'react-native'
import { cssInterop } from 'nativewind'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from './Text'
import { gradients } from '@/shared/theme/colors'

cssInterop(Pressable, { className: 'style' })

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClasses: Record<Variant, string> = {
  primary:   'rounded-full items-center overflow-hidden',
  secondary: 'border border-cyan rounded-full px-6 py-3 items-center',
  ghost:     'px-6 py-3 items-center',
}

const textClasses: Record<Variant, string> = {
  primary:   'text-white',
  secondary: 'text-cyan',
  ghost:     'text-white',
}

interface Props extends PressableProps {
  variant?: Variant
  label: string
}

export function Button({ variant = 'primary', label, disabled, style, ...props }: Props) {
  if (variant === 'primary') {
    return (
      <Pressable
        className={variantClasses.primary}
        disabled={disabled}
        style={[{ opacity: disabled ? 0.5 : 1 }, style as object]}
        {...props}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', width: '100%' }}
        >
          <Text variant="heading" className={textClasses.primary}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    )
  }

  return (
    <Pressable className={variantClasses[variant]} disabled={disabled} style={[{ opacity: disabled ? 0.5 : 1 }, style as object]} {...props}>
      <Text variant="heading" className={textClasses[variant]}>
        {label}
      </Text>
    </Pressable>
  )
}
