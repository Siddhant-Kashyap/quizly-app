import { useFeedStore } from '../store'

beforeEach(() => useFeedStore.setState({ cards: [], cursor: null, hasMore: true, currentTopic: '', likedCardIds: [], savedCardIds: [] }))

test('setTopic resets pagination state', () => {
  useFeedStore.setState({ cards: [{ id: '1' } as any], cursor: 'c1', hasMore: false })
  useFeedStore.getState().setTopic('science')
  const s = useFeedStore.getState()
  expect(s.cards).toHaveLength(0)
  expect(s.cursor).toBeNull()
  expect(s.hasMore).toBe(true)
  expect(s.currentTopic).toBe('science')
})

test('appendCards adds to existing cards', () => {
  useFeedStore.setState({ cards: [{ id: 'a' } as any] })
  useFeedStore.getState().appendCards([{ id: 'b' } as any], 'c2', true)
  expect(useFeedStore.getState().cards).toHaveLength(2)
})
