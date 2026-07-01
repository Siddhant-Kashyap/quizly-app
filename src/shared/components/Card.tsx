import React from 'react'
import { View, ViewProps } from 'react-native'
import { cssInterop } from 'nativewind'

cssInterop(View, { className: 'style' })

interface Props extends ViewProps {
  className?: string
}

export function Card({ className = '', children, ...props }: Props) {
  return (
    <View
      className={`bg-surface2 rounded-2xl border border-white/10 ${className}`}
      {...props}
    >
      {children}
    </View>
  )
}
