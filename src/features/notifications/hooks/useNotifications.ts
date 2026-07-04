import { useState, useEffect } from 'react'
import { MOCK_NOTIFICATIONS, MockNotification, mockDelay } from '@/shared/lib/mockData'

// NOTE: dummy-data mode — swap for `api.get('/notifications')` once the backend is live.
export function useNotifications() {
  const [notifications, setNotifications] = useState<MockNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    mockDelay(MOCK_NOTIFICATIONS, 300)
      .then(setNotifications)
      .finally(() => setIsLoading(false))
  }, [])

  return { notifications, isLoading }
}
