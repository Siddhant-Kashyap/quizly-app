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
    // WebSocket.close() is asynchronous — a stale socket from a prior
    // render (e.g. topic/playerId changing while still waiting) can still
    // deliver onmessage/onclose after this effect's cleanup has already
    // requested its close, before the next effect's new socket exists.
    // Without this guard, that stale event would still call setState on
    // the current component instance, potentially reporting a match (or
    // an error) from a connection that's no longer the active one.
    let active = true

    const ws = new WebSocket(
      `${process.env.EXPO_PUBLIC_WS_URL ?? ''}/matchmaking/ws?playerId=${encodeURIComponent(playerId)}&topic=${encodeURIComponent(topic)}`,
    )
    wsRef.current = ws

    ws.onopen = () => { if (active) setStatus('waiting') }
    ws.onmessage = (e) => {
      if (!active) return
      const msg = JSON.parse(e.data as string) as MatchFoundMessage
      if (msg.type === 'MATCH_FOUND') {
        setMatch(msg)
        setStatus('matched')
      }
    }
    ws.onerror = () => { if (active) setError('Failed to connect to matchmaking') }
    ws.onclose = () => { if (active) setStatus((s) => (s === 'matched' ? s : 'error')) }

    return () => {
      active = false
      ws.close()
    }
  }, [topic, playerId])

  const cancel = useCallback(() => {
    wsRef.current?.close()
  }, [])

  return { status, match, error, cancel }
}
