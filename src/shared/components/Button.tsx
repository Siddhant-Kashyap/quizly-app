import React from 'react'
import { Pressable, PressableProps } from 'react-native'
import { cssInterop } from 'nativewind'
import { Text } from './Text'

cssInterop(Pressable, { className: 'style' })

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClasses: Record<Variant, string> = {
  primary:   'bg-cyan rounded-full px-6 py-3 items-center',
  secondary: 'border border-cyan rounded-full px-6 py-3 items-center',
  ghost:     'px-6 py-3 items-center',
}

const textClasses: Record<Variant, string> = {
  primary:   'text-void',
  secondary: 'text-cyan',
  ghost:     'text-white',
}

interface Props extends PressableProps {
  variant?: Variant
  label: string
}

export function Button({ variant = 'primary', label, ...props }: Props) {
  return (
    <Pressable className={variantClasses[variant]} {...props}>
      <Text variant="heading" className={textClasses[variant]}>
        {label}
      </Text>
    </Pressable>
  )
}
