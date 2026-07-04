import React from 'react'
import { View } from 'react-native'
import { Text } from '@/shared/components'
import { Question } from '@/shared/types'

export function QuestionCard({ question, index, total }: { question: Question; index: number; total: number }) {
  return (
    <View>
      <Text variant="caption" className="text-white/40 mb-2" style={{ letterSpacing: 1 }}>
        QUESTION {index + 1} OF {total}
      </Text>
      <Text variant="title" className="text-white">{question.text}</Text>
    </View>
  )
}
