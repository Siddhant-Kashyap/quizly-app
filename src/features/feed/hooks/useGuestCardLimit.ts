import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/features/auth/store'

const STORAGE_KEY = 'factora.guestCardsViewed'
const LIMIT = 10

export function useGuestCardLimit() {
  const isGuest = useAuthStore((s) => s.isGuest)
  const [viewedIds, setViewedIds] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setViewedIds(JSON.parse(raw))
    })
  }, [])

  const recordView = useCallback((cardId: string) => {
    if (!isGuest) return
    setViewedIds((prev) => {
      if (prev.includes(cardId) || prev.length >= LIMIT) return prev
      const next = [...prev, cardId]
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [isGuest])

  return { isBlocked: isGuest && viewedIds.length >= LIMIT, recordView }
}
