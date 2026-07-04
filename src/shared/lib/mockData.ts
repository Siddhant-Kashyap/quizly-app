import { FactCard, Question, UserProfile, Badge } from '@/shared/types'

export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const MOCK_OPPONENT_NAMES = [
  'Nova', 'Zephyr', 'Quill', 'Blaze', 'Echo', 'Sable', 'Rune', 'Vesper', 'Onyx', 'Kai',
]

export function pickRandomOpponent() {
  return MOCK_OPPONENT_NAMES[Math.floor(Math.random() * MOCK_OPPONENT_NAMES.length)]
}

export interface Topic {
  slug: string
  label: string
  icon: string
  color: string
  cardCount: number
}

export const MOCK_TOPICS: Topic[] = [
  { slug: 'science', label: 'Science', icon: 'Atom', color: 'cyan', cardCount: 42 },
  { slug: 'history', label: 'History', icon: 'Landmark', color: 'gold', cardCount: 35 },
  { slug: 'space', label: 'Space', icon: 'Rocket', color: 'iris', cardCount: 28 },
  { slug: 'tech', label: 'Tech', icon: 'Cpu', color: 'fuchsia', cardCount: 31 },
  { slug: 'nature', label: 'Nature', icon: 'Leaf', color: 'ember', cardCount: 24 },
  { slug: 'pop-culture', label: 'Pop Culture', icon: 'Film', color: 'cyan', cardCount: 19 },
]

export const MOCK_FACT_CARDS: FactCard[] = [
  { id: 'c1', topic: 'science', title: 'Octopuses have three hearts', body: 'Two pump blood to the gills, one to the rest of the body. The main heart actually stops beating when the octopus swims, which is why they prefer crawling.', author: 'Dr. Lena Ortiz', readTimeSeconds: 18, likes: 1284, saves: 342 },
  { id: 'c2', topic: 'science', title: 'Bananas are berries, strawberries aren\'t', body: 'Botanically, a berry has to develop from a single flower with one ovary. Bananas qualify. Strawberries, which form from a flower with many ovaries, don\'t.', author: 'Marcus Webb', readTimeSeconds: 14, likes: 982, saves: 210 },
  { id: 'c3', topic: 'science', title: 'Honey never spoils', body: 'Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible. Its low moisture and acidity make it inhospitable to bacteria.', author: 'Dr. Lena Ortiz', readTimeSeconds: 16, likes: 2043, saves: 601 },
  { id: 'c4', topic: 'history', title: 'The shortest war lasted 38 minutes', body: 'The Anglo-Zanzibar War of 1896 between the UK and the Sultanate of Zanzibar is the shortest recorded war in history, ending in under 40 minutes.', author: 'Priya Nair', readTimeSeconds: 20, likes: 1502, saves: 388 },
  { id: 'c5', topic: 'history', title: 'Cleopatra lived closer to the Moon landing than the pyramids', body: 'The Great Pyramid was built around 2560 BCE. Cleopatra was born in 69 BCE — closer in time to 1969 than to the pyramids\' construction.', author: 'Priya Nair', readTimeSeconds: 15, likes: 3211, saves: 890 },
  { id: 'c6', topic: 'history', title: 'Oxford University predates the Aztec Empire', body: 'Teaching at Oxford began around 1096. The Aztec Empire wasn\'t founded until 1428 — Oxford is over 300 years older.', author: 'Tomas Reyes', readTimeSeconds: 17, likes: 876, saves: 155 },
  { id: 'c7', topic: 'space', title: 'A day on Venus is longer than its year', body: 'Venus takes 243 Earth days to rotate once but only 225 Earth days to orbit the Sun. Its day is longer than its year.', author: 'Amara Chen', readTimeSeconds: 19, likes: 2765, saves: 720 },
  { id: 'c8', topic: 'space', title: 'There\'s a planet made of diamond', body: '55 Cancri e, a super-Earth 40 light-years away, is theorized to have a carbon-rich composition that could make a third of its mass pure diamond.', author: 'Amara Chen', readTimeSeconds: 16, likes: 4102, saves: 1204 },
  { id: 'c9', topic: 'space', title: 'Neutron stars can spin 600 times a second', body: 'Some neutron stars, called millisecond pulsars, rotate hundreds of times per second — faster than a kitchen blender.', author: 'Dr. Iman Farouk', readTimeSeconds: 18, likes: 1890, saves: 402 },
  { id: 'c10', topic: 'tech', title: 'The first computer bug was an actual bug', body: 'In 1947, engineers at Harvard found a moth trapped in a relay of the Mark II computer, causing a malfunction — coining the term "debugging."', author: 'Jordan Blake', readTimeSeconds: 15, likes: 1345, saves: 298 },
  { id: 'c11', topic: 'tech', title: 'The first 1GB hard drive weighed 550 pounds', body: 'IBM\'s 1980 IBM 3380 stored 2.52GB, cost around $40,000, and was the size of a refrigerator.', author: 'Jordan Blake', readTimeSeconds: 17, likes: 998, saves: 231 },
  { id: 'c12', topic: 'nature', title: 'Bamboo can grow 3 feet in a day', body: 'Certain bamboo species are among the fastest-growing plants on Earth, growing up to 91 cm in a 24-hour period under ideal conditions.', author: 'Dr. Lena Ortiz', readTimeSeconds: 14, likes: 1120, saves: 267 },
  { id: 'c13', topic: 'nature', title: 'Sharks predate trees', body: 'Sharks have existed for around 400 million years. Trees didn\'t appear until roughly 350 million years ago.', author: 'Marcus Webb', readTimeSeconds: 15, likes: 2456, saves: 611 },
  { id: 'c14', topic: 'pop-culture', title: 'The Mona Lisa has no eyebrows', body: 'It was fashionable in Renaissance Florence to shave them off. Da Vinci\'s original may have had them, but if so, they\'ve since faded.', author: 'Nina Torres', readTimeSeconds: 13, likes: 1678, saves: 345 },
  { id: 'c15', topic: 'pop-culture', title: 'The Wilhelm Scream has been used in 400+ films', body: 'A stock sound effect first recorded in 1951, it has appeared in every Star Wars film and hundreds of other movies as an inside joke among sound editors.', author: 'Nina Torres', readTimeSeconds: 16, likes: 2011, saves: 502 },
]

export const MOCK_QUESTIONS: Record<string, Question[]> = {
  science: [
    { id: 'q1', type: 'mcq', text: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], xpReward: 20 },
    { id: 'q2', type: 'true_false', text: 'Bananas are botanically classified as berries.', options: ['True', 'False'], xpReward: 15 },
    { id: 'q3', type: 'mcq', text: 'Why does honey never spoil?', options: ['High sugar & low moisture', 'It is sterilized by bees', 'It contains preservatives', 'It stays frozen'], xpReward: 20 },
    { id: 'q4', type: 'mcq', text: 'What gas do plants primarily absorb for photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], xpReward: 15 },
    { id: 'q5', type: 'true_false', text: 'Light travels faster than sound.', options: ['True', 'False'], xpReward: 10 },
  ],
  history: [
    { id: 'q6', type: 'mcq', text: 'How long did the Anglo-Zanzibar War last?', options: ['38 minutes', '2 hours', '1 day', '1 week'], xpReward: 20 },
    { id: 'q7', type: 'true_false', text: 'Cleopatra lived closer in time to the Moon landing than to the pyramids.', options: ['True', 'False'], xpReward: 15 },
    { id: 'q8', type: 'mcq', text: 'Which empire was founded after Oxford began teaching?', options: ['Roman', 'Aztec', 'Egyptian', 'Persian'], xpReward: 20 },
    { id: 'q9', type: 'mcq', text: 'In what year did WWII end?', options: ['1943', '1945', '1947', '1950'], xpReward: 15 },
  ],
  space: [
    { id: 'q10', type: 'true_false', text: 'A day on Venus is longer than its year.', options: ['True', 'False'], xpReward: 15 },
    { id: 'q11', type: 'mcq', text: 'What is 55 Cancri e theorized to be partly made of?', options: ['Gold', 'Diamond', 'Ice', 'Iron'], xpReward: 20 },
    { id: 'q12', type: 'mcq', text: 'What is the closest planet to the Sun?', options: ['Venus', 'Earth', 'Mercury', 'Mars'], xpReward: 15 },
    { id: 'q13', type: 'true_false', text: 'Neutron stars can spin hundreds of times per second.', options: ['True', 'False'], xpReward: 15 },
  ],
  tech: [
    { id: 'q14', type: 'mcq', text: 'What caused the first recorded "computer bug"?', options: ['A software crash', 'A moth in a relay', 'A power surge', 'A virus'], xpReward: 20 },
    { id: 'q15', type: 'true_false', text: 'The IBM 3380 hard drive from 1980 weighed over 500 pounds.', options: ['True', 'False'], xpReward: 15 },
    { id: 'q16', type: 'mcq', text: 'Who is considered the father of the World Wide Web?', options: ['Steve Jobs', 'Tim Berners-Lee', 'Bill Gates', 'Alan Turing'], xpReward: 20 },
  ],
  nature: [
    { id: 'q17', type: 'mcq', text: 'How fast can some bamboo grow in a day?', options: ['3 inches', '1 foot', '3 feet', '10 feet'], xpReward: 20 },
    { id: 'q18', type: 'true_false', text: 'Sharks are older than trees.', options: ['True', 'False'], xpReward: 15 },
  ],
  'pop-culture': [
    { id: 'q19', type: 'true_false', text: 'The Mona Lisa has visible eyebrows.', options: ['True', 'False'], xpReward: 10 },
    { id: 'q20', type: 'mcq', text: 'The Wilhelm Scream is famously used in which franchise?', options: ['Star Wars', 'James Bond', 'Marvel', 'Harry Potter'], xpReward: 20 },
  ],
}

export const MOCK_ANSWER_KEY: Record<string, string> = {
  q1: '3',
  q2: 'True',
  q3: 'High sugar & low moisture',
  q4: 'Carbon dioxide',
  q5: 'True',
  q6: '38 minutes',
  q7: 'True',
  q8: 'Aztec',
  q9: '1945',
  q10: 'True',
  q11: 'Diamond',
  q12: 'Mercury',
  q13: 'True',
  q14: 'A moth in a relay',
  q15: 'True',
  q16: 'Tim Berners-Lee',
  q17: '3 feet',
  q18: 'True',
  q19: 'False',
  q20: 'Star Wars',
}

export const MOCK_BADGES: Badge[] = [
  { id: 'b1', name: 'First Steps', iconUrl: 'Footprints', earnedAt: '2026-06-01T00:00:00Z' },
  { id: 'b2', name: '7-Day Streak', iconUrl: 'Flame', earnedAt: '2026-06-10T00:00:00Z' },
  { id: 'b3', name: 'Quiz Master', iconUrl: 'Trophy', earnedAt: '2026-06-20T00:00:00Z' },
  { id: 'b4', name: 'Night Owl', iconUrl: 'Moon', earnedAt: '2026-06-25T00:00:00Z' },
]

export const MOCK_PROFILE: UserProfile = {
  userId: 'guest',
  xp: 2450,
  level: 8,
  streakDays: 5,
  accuracy: 0.78,
  rank: 342,
  badges: MOCK_BADGES,
  weeklyActivity: [true, true, false, true, true, true, false],
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  xp: number
}

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', username: 'Nova', xp: 18420 },
  { rank: 2, userId: 'u2', username: 'Zephyr', xp: 17110 },
  { rank: 3, userId: 'u3', username: 'Quill', xp: 16590 },
  { rank: 4, userId: 'u4', username: 'Blaze', xp: 15230 },
  { rank: 5, userId: 'u5', username: 'Echo', xp: 14870 },
  { rank: 6, userId: 'u6', username: 'Sable', xp: 13920 },
  { rank: 7, userId: 'u7', username: 'Rune', xp: 12550 },
  { rank: 8, userId: 'u8', username: 'Vesper', xp: 11340 },
  { rank: 9, userId: 'u9', username: 'Onyx', xp: 10280 },
  { rank: 10, userId: 'guest', username: 'You', xp: 2450 },
]

export interface MockNotification {
  id: string
  type: 'badge' | 'streak' | 'challenge' | 'system'
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { id: 'n1', type: 'badge', title: 'You entered top 10', body: 'Ranked #4 globally this week. Keep the momentum.', isRead: false, createdAt: '2026-07-04T08:00:00Z' },
  { id: 'n2', type: 'streak', title: '5-day streak achieved', body: 'Play a quiz today to keep the streak alive.', isRead: false, createdAt: '2026-07-04T06:00:00Z' },
  { id: 'n3', type: 'badge', title: 'Quiz Master badge unlocked', body: '+500 XP awarded for winning 10 solo quizzes.', isRead: true, createdAt: '2026-07-03T18:30:00Z' },
  { id: 'n4', type: 'challenge', title: 'Nova challenged you to a quiz', body: 'Space trivia · 5 questions', isRead: true, createdAt: '2026-07-03T09:00:00Z' },
  { id: 'n5', type: 'system', title: 'Daily quiz is live', body: '5 questions, 90 seconds. Earn 2x XP.', isRead: true, createdAt: '2026-07-02T12:00:00Z' },
]
