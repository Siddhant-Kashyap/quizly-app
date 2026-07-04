import { create } from 'zustand'
import { FactCard } from '@/shared/types'

interface FeedState {
  cards: FactCard[]
  cursor: string | null
  hasMore: boolean
  currentTopic: string
  likedCardIds: string[]
  savedCardIds: string[]
  setCards: (cards: FactCard[], cursor: string | null, hasMore: boolean) => void
  appendCards: (cards: FactCard[], cursor: string | null, hasMore: boolean) => void
  setTopic: (topic: string) => void
  likeCard: (id: string) => void
  saveCard: (id: string) => void
  unsaveCard: (id: string) => void
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  cards: [],
  cursor: null,
  hasMore: true,
  currentTopic: 'all',
  likedCardIds: [],
  savedCardIds: [],
  setCards: (cards, cursor, hasMore) => set({ cards, cursor, hasMore }),
  appendCards: (cards, cursor, hasMore) =>
    set({ cards: [...get().cards, ...cards], cursor, hasMore }),
  setTopic: (topic) => set({ currentTopic: topic, cards: [], cursor: null, hasMore: true }),
  likeCard: (id) => set({ likedCardIds: [...get().likedCardIds, id] }),
  saveCard: (id) => set({ savedCardIds: [...get().savedCardIds, id] }),
  unsaveCard: (id) =>
    set({ savedCardIds: get().savedCardIds.filter((c) => c !== id) }),
}))
