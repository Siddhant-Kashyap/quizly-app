import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/features/auth/store'

export const GUEST_CARDS_VIEWED_KEY = 'factora.guestCardsViewed'
const LIMIT = 10

export function useGuestCardLimit() {
  const isGuest = useAuthStore((s) => s.isGuest)
  const [viewedIds, setViewedIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(GUEST_CARDS_VIEWED_KEY).then((raw) => {
      let stored: string[] = []
      try {
        stored = raw ? JSON.parse(raw) : []
      } catch {
        stored = [] // corrupt/malformed persisted data — fall back rather than throw
      }
      // Merge rather than overwrite: recordView may have already run before
      // this load resolved, and we must not lose either side's data
      // regardless of resolution order.
      setViewedIds((prev) => Array.from(new Set([...stored, ...prev])))
      setLoaded(true)
    })
  }, [])

  // Persisting here (not inside the setViewedIds updater above) keeps that
  // updater a pure function of its input, and guarding on `loaded` prevents
  // writing an empty array back to storage before the initial load completes.
  useEffect(() => {
    if (!loaded) return
    AsyncStorage.setItem(GUEST_CARDS_VIEWED_KEY, JSON.stringify(viewedIds))
  }, [viewedIds, loaded])

  const recordView = useCallback((cardId: string) => {
    if (!isGuest) return
    setViewedIds((prev) => {
      if (prev.includes(cardId) || prev.length >= LIMIT) return prev
      return [...prev, cardId]
    })
  }, [isGuest])

  return { isBlocked: isGuest && viewedIds.length >= LIMIT, recordView }
}
