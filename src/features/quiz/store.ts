import { create } from 'zustand'
import { QuizSession } from '@/shared/types'

interface QuizState {
  session: QuizSession | null
  score: number
  combo: number
  xpEarned: number
  answers: Record<string, string>  // questionId → answer given
  setSession: (session: QuizSession) => void
  addScore: (points: number) => void
  incrementCombo: () => void
  resetCombo: () => void
  addXP: (xp: number) => void
  recordAnswer: (questionId: string, answer: string) => void
  endSession: () => void
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  session: null,
  score: 0,
  combo: 0,
  xpEarned: 0,
  answers: {},
  setSession: (session) => set({ session, score: 0, combo: 0, xpEarned: 0, answers: {} }),
  addScore: (points) => set({ score: get().score + points }),
  incrementCombo: () => set({ combo: get().combo + 1 }),
  resetCombo: () => set({ combo: 0 }),
  addXP: (xp) => set({ xpEarned: get().xpEarned + xp }),
  recordAnswer: (questionId, answer) =>
    set({ answers: { ...get().answers, [questionId]: answer } }),
  endSession: () => set({ session: null, score: 0, combo: 0, xpEarned: 0, answers: {} }),
}))
