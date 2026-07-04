import { useState, useCallback } from 'react'
import { useFeedStore } from '../store'
import { MOCK_FACT_CARDS, mockDelay } from '@/shared/lib/mockData'

export function useFeed() {
  const store = useFeedStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // NOTE: dummy-data mode — swap for `api.get('/cards?topic=...')` once the backend is live.
  const fetchCards = useCallback(async (topic: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const cards = topic && topic !== 'all'
        ? MOCK_FACT_CARDS.filter((c) => c.topic === topic)
        : MOCK_FACT_CARDS
      await mockDelay(null, 350)
      store.setTopic(topic)
      store.setCards(cards, null, false)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { ...store, isLoading, error, fetchCards }
}
