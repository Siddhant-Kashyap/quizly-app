import { useState, useEffect } from 'react'
import { api } from '@/shared/lib/api'
import { useProfileStore } from '../store'
import { UserProfile } from '@/shared/types'

export function useProfile() {
  const store = useProfileStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    api.get<UserProfile>('/profile')
      .then(store.setProfile)
      .finally(() => setIsLoading(false))
  }, [])

  return { ...store, isLoading }
}
