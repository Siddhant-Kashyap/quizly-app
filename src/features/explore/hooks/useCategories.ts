import { useState, useEffect } from 'react'
import { api } from '@/shared/lib/api'

interface Topic { slug: string; label: string; iconUrl: string; cardCount: number }

export function useCategories() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    api.get<Topic[]>('/topics')
      .then(setTopics)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [])

  return { topics, isLoading, error }
}
