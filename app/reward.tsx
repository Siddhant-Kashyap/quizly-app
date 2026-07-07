import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, Frown, Handshake } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useQuizStore } from '@/features/quiz/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

export default function Reward() {
  const { session, score, xpEarned, opponentScore, winnerId, answers, endSession } = useQuizStore()
  const { user } = useAuth()
  const totalAnswered = Object.keys(answers).length
  const correctCount = score / 10
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  const isPvp = session?.mode === 'p2p'
  const opponentName = session?.opponentName ?? 'Opponent'
  const outcome = winnerId === user?.id ? 'win' : winnerId === '' ? 'draw' : 'lose'

  const handleDone = () => {
    endSession()
    router.replace('/(tabs)')
  }

  const OUTCOME_COPY = {
    win: { icon: Trophy, color: colors.gold, caption: 'VICTORY', title: `You beat ${opponentName}!` },
    lose: { icon: Frown, color: colors.fuchsia, caption: 'DEFEAT', title: `${opponentName} won this round` },
    draw: { icon: Handshake, color: colors.cyan, caption: 'DRAW', title: `Tied with ${opponentName}` },
  } as const

  const { icon: Icon, color: outcomeColor, caption, title } = isPvp
    ? OUTCOME_COPY[outcome]
    : { icon: Trophy, color: colors.gold, caption: 'RARE ACHIEVEMENT', title: 'Quiz Complete!' }

  return (
    <View className="flex-1 bg-black/80 items-center justify-center px-8">
      <View
        className="absolute rounded-full"
        style={{ width: 360, height: 360, backgroundColor: colors.iris, opacity: 0.16 }}
      />

      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        <View style={{ width: 80, height: 80, borderRadius: 40 }} className="bg-void items-center justify-center">
          <Icon size={36} color={outcomeColor} />
        </View>
      </LinearGradient>

      <Text variant="caption" className="mb-2" style={{ letterSpacing: 2, color: outcomeColor }}>{caption}</Text>
      <Text variant="display" className="text-iris mb-3 text-center">{title}</Text>

      {isPvp ? (
        <Text variant="body" className="text-white/50 text-center mb-6">
          You {score} · {opponentName} {opponentScore}
        </Text>
      ) : (
        <Text variant="body" className="text-white/50 text-center mb-6">
          Answered {correctCount} of {totalAnswered} correctly · {accuracy}% accuracy
        </Text>
      )}

      <View className="rounded-full px-4 py-2 mb-8 border" style={{ borderColor: colors.cyan }}>
        <Text variant="heading" style={{ color: colors.cyan }}>⚡ +{xpEarned} XP</Text>
      </View>

      <View className="w-full" style={{ gap: 12 }}>
        <Button label="Share my badge" />
        <Button label="Keep scrolling" variant="ghost" onPress={handleDone} />
      </View>
    </View>
  )
}
