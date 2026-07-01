export interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

export interface UserProfile {
  userId: string
  xp: number
  level: number
  streakDays: number
  accuracy: number
  rank: number
  badges: Badge[]
  weeklyActivity: boolean[]
}

export interface Badge {
  id: string
  name: string
  iconUrl: string
  earnedAt: string
}

export interface FactCard {
  id: string
  topic: string
  title: string
  body: string
  imageUrl?: string
  author: string
  readTimeSeconds: number
  likes: number
  saves: number
}

export interface QuizSession {
  id: string
  mode: 'solo' | 'p2p'
  questions?: Question[]
  opponentId?: string
  wsUrl?: string
}

export interface Question {
  id: string
  type: 'mcq' | 'true_false' | 'fill_blank'
  text: string
  options?: string[]
  xpReward: number
}

export interface QuizAnswer {
  questionId: string
  correctAnswer: string
  isCorrect: boolean
  xpEarned: number
}

export interface ApiError {
  status: number
  message: string
}
