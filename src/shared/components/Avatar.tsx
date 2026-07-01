import React from 'react'
import { View } from 'react-native'
import { Text } from './Text'

interface Props {
  name: string
  size?: number
  imageUrl?: string
}

export function Avatar({ name, size = 40 }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-iris items-center justify-center"
    >
      <Text variant="caption" className="text-white font-bold">
        {initials}
      </Text>
    </View>
  )
}
