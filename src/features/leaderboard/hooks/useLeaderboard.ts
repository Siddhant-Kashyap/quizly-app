import { useState, useEffect } from 'react'
import { api } from '@/shared/lib/api'

type Period = 'weekly' | 'monthly' | 'alltime'
interface LeaderboardEntry { rank: number; userId: string; username: string; xp: number }

export function useLeaderboard(period: Period = 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    api.get<LeaderboardEntry[]>(`/leaderboard?period=${period}`)
      .then(setEntries)
      .finally(() => setIsLoading(false))
  }, [period])

  return { entries, isLoading }
}
