import { useState, useEffect } from 'react'
import { api } from '@/shared/lib/api'

interface Notification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string }

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    api.get<Notification[]>('/notifications')
      .then(setNotifications)
      .finally(() => setIsLoading(false))
  }, [])

  return { notifications, isLoading }
}
