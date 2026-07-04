import { useEffect, useState } from 'react'
import { useProfileStore } from '../store'
import { MOCK_PROFILE, mockDelay } from '@/shared/lib/mockData'

// NOTE: dummy-data mode — swap for `api.get('/profile')` once the backend is live.
export function useProfile() {
  const store = useProfileStore()
  const [isLoading, setIsLoading] = useState(!store.profile)

  useEffect(() => {
    if (store.profile) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    mockDelay(MOCK_PROFILE, 300)
      .then(store.setProfile)
      .finally(() => setIsLoading(false))
  }, [])

  return { ...store, isLoading }
}
