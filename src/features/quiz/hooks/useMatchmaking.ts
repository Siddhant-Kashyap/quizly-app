import { useCallback, useEffect, useRef, useState } from 'react'
import { MatchFoundMessage } from './wsProtocol'

export type MatchmakingStatus = 'connecting' | 'waiting' | 'matched' | 'error'

export function useMatchmaking(topic: string, playerId: string | null) {
  const [status, setStatus] = useState<MatchmakingStatus>('connecting')
  const [match, setMatch] = useState<MatchFoundMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!playerId) return

    const ws = new WebSocket(
      `${process.env.EXPO_PUBLIC_WS_URL}/matchmaking/ws?playerId=${encodeURIComponent(playerId)}&topic=${encodeURIComponent(topic)}`,
    )
    wsRef.current = ws

    ws.onopen = () => setStatus('waiting')
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as MatchFoundMessage
      if (msg.type === 'MATCH_FOUND') {
        setMatch(msg)
        setStatus('matched')
      }
    }
    ws.onerror = () => setError('Failed to connect to matchmaking')
    ws.onclose = () => setStatus((s) => (s === 'matched' ? s : 'error'))

    return () => {
      ws.close()
    }
  }, [topic, playerId])

  const cancel = useCallback(() => {
    wsRef.current?.close()
  }, [])

  return { status, match, error, cancel }
}
