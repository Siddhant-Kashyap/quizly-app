import { useCallback, useEffect, useRef, useState } from 'react'
import { Question } from '@/shared/types'
import { GameplayMessage } from './wsProtocol'

interface PvpGameplayState {
  question: Question | null
  questionNumber: number
  totalQuestions: number
  timerSeconds: number
  myScore: number
  opponentScore: number
  myCombo: number
  correctAnswer: string | null
  sessionEnded: boolean
  winnerId: string
  xpEarned: number
  error: string | null
}

const initialState: PvpGameplayState = {
  question: null,
  questionNumber: 0,
  totalQuestions: 0,
  timerSeconds: 0,
  myScore: 0,
  opponentScore: 0,
  myCombo: 0,
  correctAnswer: null,
  sessionEnded: false,
  winnerId: '',
  xpEarned: 0,
  error: null,
}

export function usePvpGameplay(wsUrl: string | null, myPlayerId: string, opponentId: string) {
  const [state, setState] = useState<PvpGameplayState>(initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const endedCleanlyRef = useRef(false)

  useEffect(() => {
    if (!wsUrl) return
    // See useMatchmaking.ts for why this guard is needed: WebSocket.close()
    // is asynchronous, so a stale socket from a prior render can still fire
    // onmessage/onclose after this effect's cleanup already requested its
    // close, before the next effect's new socket exists.
    let active = true
    // Reset per-session state on every (re)connect — wsUrl/myPlayerId/
    // opponentId changing means a new session (e.g. a rematch reusing the
    // same mounted hook instance), and leftover state from the previous
    // session (sessionEnded, scores, endedCleanlyRef) must not leak into it.
    endedCleanlyRef.current = false
    setState(initialState)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      if (!active) return
      const msg = JSON.parse(e.data as string) as GameplayMessage
      switch (msg.type) {
        case 'QUESTION_START':
          setState((s) => ({
            ...s,
            question: msg.question as Question,
            questionNumber: msg.questionNumber,
            totalQuestions: msg.totalQuestions,
            timerSeconds: msg.timerSeconds,
            correctAnswer: null,
          }))
          break
        case 'QUESTION_RESULT':
          setState((s) => ({
            ...s,
            correctAnswer: msg.correctAnswer,
            myScore: msg.scores[myPlayerId] ?? s.myScore,
            opponentScore: msg.scores[opponentId] ?? s.opponentScore,
            myCombo: msg.combos[myPlayerId] ?? s.myCombo,
          }))
          break
        case 'SESSION_END':
          endedCleanlyRef.current = true
          setState((s) => ({
            ...s,
            sessionEnded: true,
            winnerId: msg.winnerId,
            myScore: msg.scores[myPlayerId] ?? s.myScore,
            opponentScore: msg.scores[opponentId] ?? s.opponentScore,
            xpEarned: msg.xpEarned[myPlayerId] ?? s.xpEarned,
          }))
          break
        case 'PLAYER_DISCONNECTED':
          // No dedicated UI state — SESSION_END always follows immediately.
          break
      }
    }
    ws.onerror = () => { if (active) setState((s) => ({ ...s, error: 'Connection error' })) }
    ws.onclose = () => {
      if (!active) return
      if (!endedCleanlyRef.current) {
        setState((s) => ({ ...s, error: s.error ?? 'Connection closed unexpectedly' }))
      }
    }

    return () => {
      active = false
      ws.close()
    }
  }, [wsUrl, myPlayerId, opponentId])

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'PLAYER_ANSWER', questionId, answer }))
  }, [])

  return { ...state, submitAnswer }
}
