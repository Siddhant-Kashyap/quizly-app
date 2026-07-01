import { api } from '@/shared/lib/api'
import { QuizSession, QuizAnswer } from '@/shared/types'
import { useQuizStore } from '../store'

export function useQuizSession() {
  const store = useQuizStore()

  const startSolo = async (topic: string): Promise<QuizSession> => {
    const session = await api.post<QuizSession>('/quiz/start', { topic, mode: 'solo' })
    store.setSession(session)
    return session
  }

  const startP2P = async (topic: string, opponentId?: string): Promise<QuizSession> => {
    const session = await api.post<QuizSession>('/quiz/start', { topic, mode: 'p2p', opponentId })
    store.setSession(session)
    return session
  }

  const submitAnswer = async (sessionId: string, questionId: string, answer: string): Promise<QuizAnswer> => {
    return api.post<QuizAnswer>('/quiz/answer', { sessionId, questionId, answer })
  }

  return { startSolo, startP2P, submitAnswer, ...store }
}
