// Shared message shapes for both WebSocket connections this feature uses
// (matchmaking and gameplay). Field names/shapes match the Go backend's
// wire format exactly — see service/go/internal/ws/game_loop.go and
// service/go/internal/match/matchmaker.go.

export interface MatchFoundMessage {
  type: 'MATCH_FOUND'
  sessionId: string
  opponentId: string
  wsUrl: string
}

export interface QuestionStartMessage {
  type: 'QUESTION_START'
  question: { id: string; type: string; text: string; options: string[]; xpReward: number }
  questionNumber: number
  totalQuestions: number
  timerSeconds: number
}

export interface QuestionResultMessage {
  type: 'QUESTION_RESULT'
  winnerId: string
  correctAnswer: string
  scores: Record<string, number>
  combos: Record<string, number>
}

export interface SessionEndMessage {
  type: 'SESSION_END'
  winnerId: string
  scores: Record<string, number>
  xpEarned: Record<string, number>
}

export interface PlayerDisconnectedMessage {
  type: 'PLAYER_DISCONNECTED'
  playerId: string
}

export type GameplayMessage =
  | QuestionStartMessage
  | QuestionResultMessage
  | SessionEndMessage
  | PlayerDisconnectedMessage
