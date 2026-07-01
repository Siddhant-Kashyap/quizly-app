import { useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { useFeedStore } from '../store'
import { FactCard } from '@/shared/types'

export function useFeed() {
  const store = useFeedStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCards = useCallback(async (topic: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { cards, nextCursor } = await api.get<{ cards: FactCard[]; nextCursor: string | null }>(
        `/cards?topic=${topic}`,
      )
      store.setCards(cards, nextCursor, !!nextCursor)
      store.setTopic(topic)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { ...store, isLoading, error, fetchCards }
}
