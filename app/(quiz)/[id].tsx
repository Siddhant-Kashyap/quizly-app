import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, Avatar, Skeleton, Button } from '@/shared/components'
import { QuestionCard } from '@/features/quiz/components/QuestionCard'
import { AnswerOption, AnswerState } from '@/features/quiz/components/AnswerOption'
import { Timer } from '@/features/quiz/components/Timer'
import { useQuizSession } from '@/features/quiz/hooks/useQuizSession'
import { usePvpGameplay } from '@/features/quiz/hooks/usePvpGameplay'
import { useQuizStore } from '@/features/quiz/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { colors } from '@/shared/theme/colors'

const LETTERS = ['A', 'B', 'C', 'D']

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

function SoloQuizPlay({ id }: { id: string }) {
  const { startSolo, submitAnswer, finishSolo, session, score, combo, recordAnswer, addScore, addXP, incrementCombo, resetCombo } = useQuizSession()
  const haptics = useHaptics()

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)

  useEffect(() => {
    startSolo(id)
  }, [id])

  const questions = session?.questions ?? []
  const question = questions[index]

  const finishQuiz = async () => {
    const state = useQuizStore.getState()
    if (state.session) {
      const totalAnswered = Object.keys(state.answers).length
      const accuracy = totalAnswered > 0 ? state.score / (totalAnswered * 10) : 0
      try {
        await finishSolo(state.session.sessionId, state.score, state.xpEarned, state.comboMax, accuracy)
      } catch {
        // Best-effort — don't block showing the reward screen on a network failure.
      }
    }
    router.replace('/reward')
  }

  const handleAnswer = async (answer: string) => {
    if (!question || selected) return
    setSelected(answer)
    const result = await submitAnswer(session!.sessionId, question.id, answer, 'solo')
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
      <View className="items-center mb-6">
        <View
          className="rounded-full items-center justify-center bg-surface2"
          style={{ width: 64, height: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text variant="title" className="text-white">{String(score).padStart(2, '0')}</Text>
        </View>
      </View>

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

function PvpQuizPlay({ sessionId, opponentId, opponentName, wsUrl }: { sessionId: string; opponentId: string; opponentName: string; wsUrl: string }) {
  const { user } = useAuth()
  const haptics = useHaptics()
  const setSession = useQuizStore((s) => s.setSession)
  const setPvpResult = useQuizStore((s) => s.setPvpResult)
  const {
    question, questionNumber, totalQuestions, timerSeconds,
    myScore, opponentScore, myCombo, correctAnswer, sessionEnded, winnerId, xpEarned, error,
    submitAnswer,
  } = usePvpGameplay(wsUrl, user!.id, opponentId)

  const [selected, setSelected] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    // reward.tsx reads session.mode/opponentName from the store — nothing
    // else populates it for the pvp path (solo's useQuizSession.startSolo
    // does this for solo via its own setSession call), so this screen has
    // to set it itself, once, on mount.
    setSession({ sessionId, mode: 'p2p', opponentId, opponentName, wsUrl })
  }, [sessionId, opponentId, opponentName, wsUrl, setSession])

  useEffect(() => {
    // A new question arriving resets per-question local UI state.
    setSelected(null)
    setExpired(false)
  }, [question?.id])

  useEffect(() => {
    if (!sessionEnded) return
    setPvpResult(myScore, opponentScore, xpEarned, winnerId)
    router.replace('/reward')
  }, [sessionEnded])

  const handleAnswer = (answer: string) => {
    if (!question || selected || expired || sessionEnded) return
    setSelected(answer)
    submitAnswer(question.id, answer)
    // No synchronous result here, unlike solo mode — correctness feedback
    // arrives asynchronously via the QUESTION_RESULT message updating
    // `correctAnswer` above, which the haptics useEffect below reacts to.
  }

  useEffect(() => {
    if (correctAnswer === null || !selected) return
    if (selected === correctAnswer) haptics.success()
    else haptics.error()
  }, [correctAnswer])

  if (error) {
    return (
      <View className="flex-1 bg-void items-center justify-center px-8">
        <Text variant="title" className="text-white mb-2">Connection lost</Text>
        <Text variant="body" className="text-white/50 text-center mb-10">{error}</Text>
        <Button label="Back to home" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    )
  }

  if (!question) {
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
    if (!selected && correctAnswer === null) return 'default'
    if (option === correctAnswer) return 'correct'
    if (option === selected && option !== correctAnswer) return 'incorrect'
    return 'default'
  }

  const options = question.options ?? ['True', 'False']

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <View className="flex-row items-center justify-between mb-6">
        <PlayerRing name="You" color={colors.cyan} sub={`${questionNumber} of ${totalQuestions}`} />

        <View
          className="rounded-full items-center justify-center bg-surface2"
          style={{ width: 56, height: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text variant="title" className="text-white">{String(myScore).padStart(2, '0')}</Text>
        </View>

        <PlayerRing name={opponentName} color={colors.fuchsia} sub={`Score ${opponentScore}`} />
      </View>

      <View className="mb-4">
        <Timer key={question.id} duration={timerSeconds} isPaused={!!selected || expired} onExpire={() => setExpired(true)} />
      </View>

      {myCombo > 1 && (
        <View className="self-center rounded-full px-4 py-1 mb-4 bg-fuchsia/20">
          <Text variant="heading" style={{ color: colors.fuchsia }}>⚡ x{myCombo} combo</Text>
        </View>
      )}

      <QuestionCard question={question} index={questionNumber - 1} total={totalQuestions} />

      <View className="mt-6">
        {options.map((option, i) => (
          <AnswerOption
            key={option}
            label={option}
            letter={LETTERS[i] ?? `${i + 1}`}
            state={optionState(option)}
            disabled={!!selected || expired || sessionEnded}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between mt-auto pb-6">
        <Text variant="caption" className="text-cyan">⚡ +{question.xpReward} XP if correct</Text>
        <View className="flex-row" style={{ gap: 6 }}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: i <= questionNumber - 1 ? colors.cyan : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

export default function QuizPlay() {
  const { id, mode, sessionId, opponentId, opponentName, wsUrl } = useLocalSearchParams<{
    id: string; mode?: string; sessionId?: string; opponentId?: string; opponentName?: string; wsUrl?: string
  }>()
  const isPvp = mode === 'pvp'

  if (isPvp) {
    if (!sessionId || !opponentId || !wsUrl) {
      // Missing required pvp params — nothing sensible to render.
      return (
        <View className="flex-1 bg-void px-6 pt-20" style={{ gap: 16 }}>
          <Skeleton height={100} />
        </View>
      )
    }
    return (
      <PvpQuizPlay
        sessionId={sessionId}
        opponentId={opponentId}
        opponentName={opponentName ?? 'Opponent'}
        wsUrl={wsUrl}
      />
    )
  }

  return <SoloQuizPlay id={id} />
}
