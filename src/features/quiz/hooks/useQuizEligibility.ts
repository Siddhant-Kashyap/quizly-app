import { api } from '@/shared/lib/api'

// A guest limit isn't worth blocking the whole app over a flaky network
// request — if the eligibility check itself fails, fail open (allow).
export function useQuizEligibility() {
  return async (mode: 'solo' | 'p2p'): Promise<boolean> => {
    try {
      const { allowed } = await api.get<{ allowed: boolean }>(`/quiz/eligibility?mode=${mode}`)
      return allowed
    } catch {
      return true
    }
  }
}
