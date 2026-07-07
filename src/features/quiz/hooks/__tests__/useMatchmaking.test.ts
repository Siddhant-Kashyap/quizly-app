import { renderHook, act } from '@testing-library/react-native'
import { useMatchmaking } from '../useMatchmaking'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onclose: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(_data: string) {}
  close() {
    this.closed = true
    this.onclose?.()
  }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  ;(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
})

test('connects to the matchmaking endpoint with playerId and topic', () => {
  renderHook(() => useMatchmaking('science', 'player-1'))
  expect(FakeWebSocket.instances).toHaveLength(1)
  expect(FakeWebSocket.instances[0].url).toContain('playerId=player-1')
  expect(FakeWebSocket.instances[0].url).toContain('topic=science')
})

test('reaches matched status on a MATCH_FOUND message', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]

  act(() => { ws.onopen?.() })
  expect(result.current.status).toBe('waiting')

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({ type: 'MATCH_FOUND', sessionId: 's1', opponentId: 'player-2', wsUrl: 'ws://x' }) })
  })
  expect(result.current.status).toBe('matched')
  expect(result.current.match).toEqual({ type: 'MATCH_FOUND', sessionId: 's1', opponentId: 'player-2', wsUrl: 'ws://x' })
})

test('cancel closes the socket', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]
  act(() => { result.current.cancel() })
  expect(ws.closed).toBe(true)
})

test('surfaces a connection error', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]
  act(() => { ws.onerror?.(new Error('boom')) })
  expect(result.current.error).toBeTruthy()
})
