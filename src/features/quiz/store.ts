import { create } from 'zustand'
import { QuizSession } from '@/shared/types'

interface QuizState {
  session: QuizSession | null
  score: number
  combo: number
  comboMax: number
  xpEarned: number
  opponentScore: number
  winnerId: string  // '' means unset/draw
  answers: Record<string, string>  // questionId → answer given
  setSession: (session: QuizSession) => void
  addScore: (points: number) => void
  incrementCombo: () => void
  resetCombo: () => void
  addXP: (xp: number) => void
  addOpponentScore: (points: number) => void
  setPvpResult: (score: number, opponentScore: number, xpEarned: number, winnerId: string) => void
  recordAnswer: (questionId: string, answer: string) => void
  endSession: () => void
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  session: null,
  score: 0,
  combo: 0,
  comboMax: 0,
  xpEarned: 0,
  opponentScore: 0,
  winnerId: '',
  answers: {},
  setSession: (session) => set({ session, score: 0, combo: 0, comboMax: 0, xpEarned: 0, opponentScore: 0, winnerId: '', answers: {} }),
  addScore: (points) => set({ score: get().score + points }),
  incrementCombo: () => set((s) => ({ combo: s.combo + 1, comboMax: Math.max(s.comboMax, s.combo + 1) })),
  resetCombo: () => set({ combo: 0 }),
  addXP: (xp) => set({ xpEarned: get().xpEarned + xp }),
  addOpponentScore: (points) => set({ opponentScore: get().opponentScore + points }),
  setPvpResult: (score, opponentScore, xpEarned, winnerId) => set({ score, opponentScore, xpEarned, winnerId }),
  recordAnswer: (questionId, answer) =>
    set({ answers: { ...get().answers, [questionId]: answer } }),
  endSession: () => set({ session: null, score: 0, combo: 0, comboMax: 0, xpEarned: 0, opponentScore: 0, winnerId: '', answers: {} }),
}))
