import { useQuizStore } from '../store'

beforeEach(() => useQuizStore.setState({ session: null, score: 0, combo: 0, xpEarned: 0, answers: {} }))

test('incrementCombo then resetCombo', () => {
  useQuizStore.getState().incrementCombo()
  useQuizStore.getState().incrementCombo()
  expect(useQuizStore.getState().combo).toBe(2)
  useQuizStore.getState().resetCombo()
  expect(useQuizStore.getState().combo).toBe(0)
})

test('recordAnswer stores answer by questionId', () => {
  useQuizStore.getState().recordAnswer('q1', 'B')
  expect(useQuizStore.getState().answers['q1']).toBe('B')
})

test('endSession clears all state', () => {
  useQuizStore.setState({ score: 10, combo: 3, answers: { q1: 'A' } })
  useQuizStore.getState().endSession()
  const s = useQuizStore.getState()
  expect(s.score).toBe(0)
  expect(s.combo).toBe(0)
  expect(s.answers).toEqual({})
})

test('setPvpResult sets score/opponentScore/xpEarned/winnerId directly', () => {
  useQuizStore.getState().setPvpResult(3, 1, 60, 'me')
  const s = useQuizStore.getState()
  expect(s.score).toBe(3)
  expect(s.opponentScore).toBe(1)
  expect(s.xpEarned).toBe(60)
  expect(s.winnerId).toBe('me')
})

test('endSession resets winnerId back to empty string', () => {
  useQuizStore.getState().setPvpResult(3, 1, 60, 'me')
  useQuizStore.getState().endSession()
  expect(useQuizStore.getState().winnerId).toBe('')
})
