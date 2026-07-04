import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, Avatar, Skeleton } from '@/shared/components'
import { QuestionCard } from '@/features/quiz/components/QuestionCard'
import { AnswerOption, AnswerState } from '@/features/quiz/components/AnswerOption'
import { Timer } from '@/features/quiz/components/Timer'
import { useQuizSession } from '@/features/quiz/hooks/useQuizSession'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { colors } from '@/shared/theme/colors'

const LETTERS = ['A', 'B', 'C', 'D']
const OPPONENT_ACCURACY = 0.65
const PVP_QUESTION_SECONDS = 5

function PlayerRing({ name, color, sub }: { name: string; color: string; sub: string }) {
  return (
    <View className="items-center">
      <View
        className="rounded-full items-center justify-center"
        style={{ width: 60, height: 60, borderWidth: 2, borderColor: color }}
      >
        <Avatar name={name} size={50} />
      </View>
      <Text variant="heading" className="text-white mt-2">{name}</Text>
      <Text variant="caption" className="text-white/40">{sub}</Text>
    </View>
  )
}

export default function QuizPlay() {
  const { id, mode, opponent } = useLocalSearchParams<{ id: string; mode?: string; opponent?: string }>()
  const isPvp = mode === 'pvp'
  const opponentName = opponent ?? 'Bot'

  const { startSolo, startP2P, submitAnswer, session, score, combo, opponentScore, recordAnswer, addScore, addXP, addOpponentScore, incrementCombo, resetCombo } = useQuizSession()
  const haptics = useHaptics()

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [opponentIndex, setOpponentIndex] = useState(0)
  const opponentTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (isPvp) startP2P(id, opponentName)
    else startSolo(id)
  }, [id])

  const questions = session?.questions ?? []
  const question = questions[index]

  // Cosmetic opponent — races alongside you in pvp mode with its own simulated accuracy.
  useEffect(() => {
    if (!isPvp || !questions.length || opponentIndex >= questions.length) return
    opponentTimeout.current = setTimeout(() => {
      if (Math.random() < OPPONENT_ACCURACY) addOpponentScore(10)
      setOpponentIndex((i) => Math.min(i + 1, questions.length))
    }, 1500 + Math.random() * 2500)
    return () => clearTimeout(opponentTimeout.current)
  }, [isPvp, opponentIndex, questions.length])

  const finishQuiz = () => {
    router.replace('/reward')
  }

  const handleExpire = () => {
    if (!selected) handleAnswer('')
  }

  const handleAnswer = async (answer: string) => {
    if (!question || selected) return
    setSelected(answer)
    const result = await submitAnswer(session!.id, question.id, answer)
    setCorrectAnswer(result.correctAnswer)
    recordAnswer(question.id, answer)

    if (result.isCorrect) {
      haptics.success()
      addScore(10)
      addXP(result.xpEarned)
      incrementCombo()
    } else {
      haptics.error()
      resetCombo()
    }

    setTimeout(() => {
      if (index + 1 >= questions.length) {
        finishQuiz()
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
        setCorrectAnswer(null)
      }
    }, 1200)
  }

  if (!session || !question) {
    return (
      <View className="flex-1 bg-void px-6 pt-20" style={{ gap: 16 }}>
        <Skeleton height={100} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    )
  }

  const optionState = (option: string): AnswerState => {
    if (!selected) return 'default'
    if (option === correctAnswer) return 'correct'
    if (option === selected && option !== correctAnswer) return 'incorrect'
    return 'default'
  }

  const options = question.options ?? ['True', 'False']

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      {isPvp ? (
        <View className="flex-row items-center justify-between mb-6">
          <PlayerRing name="You" color={colors.cyan} sub={`${index + 1} of ${questions.length}`} />

          <View
            className="rounded-full items-center justify-center bg-surface2"
            style={{ width: 56, height: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text variant="title" className="text-white">{String(score).padStart(2, '0')}</Text>
          </View>

          <PlayerRing name={opponentName} color={colors.fuchsia} sub={`Score ${opponentScore}`} />
        </View>
      ) : (
        <View className="items-center mb-6">
          <View
            className="rounded-full items-center justify-center bg-surface2"
            style={{ width: 64, height: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text variant="title" className="text-white">{String(score).padStart(2, '0')}</Text>
          </View>
        </View>
      )}

      {isPvp && (
        <View className="mb-4">
          <Timer key={question.id} duration={PVP_QUESTION_SECONDS} isPaused={!!selected} onExpire={handleExpire} />
        </View>
      )}

      {combo > 1 && (
        <View className="self-center rounded-full px-4 py-1 mb-4 bg-fuchsia/20">
          <Text variant="heading" style={{ color: colors.fuchsia }}>⚡ x{combo} combo</Text>
        </View>
      )}

      <QuestionCard question={question} index={index} total={questions.length} />

      <View className="mt-6">
        {options.map((option, i) => (
          <AnswerOption
            key={option}
            label={option}
            letter={LETTERS[i] ?? `${i + 1}`}
            state={optionState(option)}
            disabled={!!selected}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between mt-auto pb-6">
        <Text variant="caption" className="text-cyan">⚡ +{question.xpReward} XP if correct</Text>
        <View className="flex-row" style={{ gap: 6 }}>
          {questions.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: i <= index ? colors.cyan : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}
