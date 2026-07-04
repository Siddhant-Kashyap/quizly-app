import { useState, useEffect } from 'react'
import { MOCK_TOPICS, Topic, mockDelay } from '@/shared/lib/mockData'

// NOTE: dummy-data mode — swap for `api.get('/topics')` once the backend is live.
export function useCategories() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    mockDelay(MOCK_TOPICS, 300)
      .then(setTopics)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [])

  return { topics, isLoading, error }
}
