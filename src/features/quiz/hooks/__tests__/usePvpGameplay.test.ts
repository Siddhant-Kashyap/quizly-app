import { renderHook, act } from '@testing-library/react-native'
import { usePvpGameplay } from '../usePvpGameplay'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(data: string) { this.sent.push(data) }
  close() {
    this.closed = true
    this.onclose?.()
  }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  ;(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
})

test('connects directly to the given wsUrl', () => {
  renderHook(() => usePvpGameplay('ws://example/ws?sessionId=s1&playerId=me', 'me', 'opp'))
  expect(FakeWebSocket.instances).toHaveLength(1)
  expect(FakeWebSocket.instances[0].url).toBe('ws://example/ws?sessionId=s1&playerId=me')
})

test('QUESTION_START sets question/questionNumber/totalQuestions/timerSeconds', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'QUESTION_START',
      question: { id: 'q1', type: 'mcq', text: 'Q?', options: ['A', 'B'], xpReward: 20 },
      questionNumber: 1,
      totalQuestions: 5,
      timerSeconds: 5,
    }) })
  })

  expect(result.current.question).toEqual({ id: 'q1', type: 'mcq', text: 'Q?', options: ['A', 'B'], xpReward: 20 })
  expect(result.current.questionNumber).toBe(1)
  expect(result.current.totalQuestions).toBe(5)
  expect(result.current.timerSeconds).toBe(5)
  expect(result.current.correctAnswer).toBeNull()
})

test('QUESTION_RESULT derives myScore/opponentScore/myCombo from the keyed maps', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'QUESTION_RESULT',
      winnerId: 'me',
      correctAnswer: 'B',
      scores: { me: 1, opp: 0 },
      combos: { me: 1, opp: 0 },
    }) })
  })

  expect(result.current.correctAnswer).toBe('B')
  expect(result.current.myScore).toBe(1)
  expect(result.current.opponentScore).toBe(0)
  expect(result.current.myCombo).toBe(1)
})

test('SESSION_END sets sessionEnded/winnerId/xpEarned', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'SESSION_END',
      winnerId: 'me',
      scores: { me: 3, opp: 1 },
      xpEarned: { me: 60, opp: 20 },
    }) })
  })

  expect(result.current.sessionEnded).toBe(true)
  expect(result.current.winnerId).toBe('me')
  expect(result.current.myScore).toBe(3)
  expect(result.current.opponentScore).toBe(1)
  expect(result.current.xpEarned).toBe(60)
})

test('submitAnswer sends a well-formed PLAYER_ANSWER message', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => { result.current.submitAnswer('q1', 'B') })

  expect(ws.sent).toHaveLength(1)
  expect(JSON.parse(ws.sent[0])).toEqual({ type: 'PLAYER_ANSWER', questionId: 'q1', answer: 'B' })
})

test('an unexpected close before SESSION_END surfaces an error', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => { ws.onclose?.() })

  expect(result.current.error).toBeTruthy()
  expect(result.current.sessionEnded).toBe(false)
})

test('a close after a clean SESSION_END does not surface an error', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({ type: 'SESSION_END', winnerId: '', scores: {}, xpEarned: {} }) })
  })
  act(() => { ws.onclose?.() })

  expect(result.current.error).toBeNull()
})
