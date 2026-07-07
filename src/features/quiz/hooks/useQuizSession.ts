import { QuizSession, QuizAnswer, StartQuizResponse, AnswerResponse, Topic } from '@/shared/types'
import { useQuizStore } from '../store'
import { api } from '@/shared/lib/api'

// The backend has no "all topics" concept — POST /quiz/start does an exact
// topic match (see service/docs/API.md §2/§4). To keep the "Mixed Quiz"
// experience, start a session per real topic and merge the questions
// client-side, keeping one of the returned sessionIds to submit
// answers/results against (sessionId isn't validated against server-side
// session state today — see API.md §2 AnswerRequest note).
async function startSoloAllTopics(): Promise<StartQuizResponse> {
  const topics = await api.get<Topic[]>('/topics')
  const responses = await Promise.all(
    topics.map((t) => api.post<StartQuizResponse>('/quiz/start', { topic: t.slug, mode: 'solo' })),
  )
  const questions = responses.flatMap((r) => r.questions).sort(() => Math.random() - 0.5).slice(0, 6)
  return { sessionId: responses[0].sessionId, mode: 'solo', questions, wsUrl: null }
}

export function useQuizSession() {
  const store = useQuizStore()

  const startSolo = async (topic: string): Promise<QuizSession> => {
    const response = topic === 'all'
      ? await startSoloAllTopics()
      : await api.post<StartQuizResponse>('/quiz/start', { topic, mode: 'solo' })
    const session: QuizSession = { sessionId: response.sessionId, mode: 'solo', questions: response.questions }
    store.setSession(session)
    return session
  }

  const submitAnswer = async (sessionId: string, questionId: string, answer: string, mode: 'solo'): Promise<QuizAnswer> => {
    const result = await api.post<AnswerResponse>('/quiz/answer', { sessionId, questionId, answer })
    return { questionId, ...result }
  }

  const finishSolo = async (sessionId: string, score: number, xpEarned: number, comboMax: number, accuracy: number) => {
    await api.post('/quiz/solo/result', { sessionId, score, xpEarned, comboMax, accuracy })
  }

  return { startSolo, submitAnswer, finishSolo, ...store }
}
