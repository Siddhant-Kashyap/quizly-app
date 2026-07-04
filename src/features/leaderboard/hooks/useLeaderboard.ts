import { useState, useEffect } from 'react'
import { MOCK_LEADERBOARD, LeaderboardEntry, mockDelay } from '@/shared/lib/mockData'

type Period = 'weekly' | 'monthly' | 'alltime'

// NOTE: dummy-data mode — swap for `api.get('/leaderboard?period=...')` once the backend is live.
export function useLeaderboard(period: Period = 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    mockDelay(MOCK_LEADERBOARD, 300)
      .then(setEntries)
      .finally(() => setIsLoading(false))
  }, [period])

  return { entries, isLoading }
}

export type { Period }
