export interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

export interface AuthResponse {
  jwt: string
  user: User & { isGuest: boolean }
}

export interface UserProfile {
  userId: string
  xp: number
  level: number
  streakDays: number
  accuracy: number
  rank: number | null
  badges: Badge[]
  weeklyActivity: boolean[]
}

export interface Badge {
  id: string
  badgeType: string
  earnedAt: string
}

export interface Topic {
  id: string
  slug: string
  label: string
  iconUrl: string
  cardCount: number
}

export interface FactCard {
  id: string
  topic: string
  title: string
  body: string
  imageUrl?: string
  author: string
  readTimeSec: number
  likes: number
  saves: number
  likedByMe: boolean
  savedByMe: boolean
}

export interface FeedResponse {
  cards: FactCard[]
  nextCursor: string | null
}

export interface QuizSession {
  sessionId: string
  mode: 'solo' | 'p2p'
  questions?: Question[]
  opponentId?: string
  opponentName?: string
  wsUrl?: string | null
}

export interface PublicUserProfile {
  id: string
  username: string
  avatarUrl: string | null
}

export interface Question {
  id: string
  type: 'mcq' | 'true_false' | 'fill_blank'
  text: string
  options?: string[]
  xpReward: number
}

export interface StartQuizResponse {
  sessionId: string
  mode: string
  questions: Question[]
  wsUrl: string | null
}

export interface AnswerResponse {
  isCorrect: boolean
  correctAnswer: string
  xpEarned: number
}

export interface QuizAnswer {
  questionId: string
  correctAnswer: string
  isCorrect: boolean
  xpEarned: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl: string
  xp: number
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export interface ApiError {
  status: number
  message: string
}
