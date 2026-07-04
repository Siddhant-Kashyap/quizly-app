import { QuizSession, QuizAnswer, Question } from '@/shared/types'
import { useQuizStore } from '../store'
import { MOCK_QUESTIONS, MOCK_ANSWER_KEY, mockDelay } from '@/shared/lib/mockData'

function questionsForTopic(topic: string): Question[] {
  if (topic === 'all') {
    return Object.values(MOCK_QUESTIONS).flat().sort(() => Math.random() - 0.5).slice(0, 6)
  }
  return MOCK_QUESTIONS[topic] ?? Object.values(MOCK_QUESTIONS).flat().slice(0, 6)
}

// NOTE: dummy-data mode — swap for `api.post('/quiz/start' | '/quiz/answer', ...)` once the backend is live.
export function useQuizSession() {
  const store = useQuizStore()

  const startSolo = async (topic: string): Promise<QuizSession> => {
    const session: QuizSession = { id: `solo_${topic}_${Date.now()}`, mode: 'solo', questions: questionsForTopic(topic) }
    await mockDelay(null, 250)
    store.setSession(session)
    return session
  }

  const startP2P = async (topic: string, opponentId?: string): Promise<QuizSession> => {
    const session: QuizSession = { id: `p2p_${topic}_${Date.now()}`, mode: 'p2p', opponentId, questions: questionsForTopic(topic) }
    await mockDelay(null, 250)
    store.setSession(session)
    return session
  }

  const submitAnswer = async (sessionId: string, questionId: string, answer: string): Promise<QuizAnswer> => {
    const correctAnswer = MOCK_ANSWER_KEY[questionId] ?? ''
    const isCorrect = answer === correctAnswer
    const question = Object.values(MOCK_QUESTIONS).flat().find((q) => q.id === questionId)
    const xpEarned = isCorrect ? question?.xpReward ?? 0 : 0
    await mockDelay(null, 150)
    return { questionId, correctAnswer, isCorrect, xpEarned }
  }

  return { startSolo, startP2P, submitAnswer, ...store }
}
