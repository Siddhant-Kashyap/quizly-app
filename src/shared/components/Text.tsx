import React from 'react'
import { Text as RNText, TextProps } from 'react-native'
import { cssInterop } from 'nativewind'
import { typography, TypographyVariant } from '@/shared/theme/typography'

cssInterop(RNText, { className: 'style' })

interface Props extends TextProps {
  variant?: TypographyVariant
  className?: string
}

export function Text({ variant = 'body', style, className, ...props }: Props) {
  return (
    <RNText
      style={[typography[variant], ...(style ? [style] : [{}])]}
      className={className}
      {...props}
    />
  )
}
