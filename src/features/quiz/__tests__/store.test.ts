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
