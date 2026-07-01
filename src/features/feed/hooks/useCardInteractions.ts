import { api } from '@/shared/lib/api'

export function useCardInteractions() {
  const like = async (cardId: string) => {
    await api.post(`/cards/${cardId}/like`, {})
  }
  const save = async (cardId: string) => {
    await api.post(`/cards/${cardId}/save`, {})
  }
  const unsave = async (cardId: string) => {
    await api.delete(`/cards/${cardId}/save`)
  }
  return { like, save, unsave }
}
