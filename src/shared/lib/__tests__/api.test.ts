import { api, setAuthToken, setGuestId } from '../api'

global.fetch = jest.fn()

beforeEach(() => {
  jest.resetAllMocks()
  setAuthToken(null)
  setGuestId(null)
})

test('GET request calls correct URL', async () => {
  ;(fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: 'ok' }),
  })
  await api.get('/test')
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/test'),
    expect.objectContaining({ headers: expect.any(Object) }),
  )
})

test('attaches Bearer token when set', async () => {
  setAuthToken('test-token')
  ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) })
  await api.get('/test')
  const headers = (fetch as jest.Mock).mock.calls[0][1].headers
  expect(headers['Authorization']).toBe('Bearer test-token')
})

test('throws ApiError on non-2xx response', async () => {
  ;(fetch as jest.Mock).mockResolvedValueOnce({
    ok: false, status: 401, statusText: 'Unauthorized',
    json: async () => ({ status: 401, message: 'Unauthorized' }),
  })
  await expect(api.get('/test')).rejects.toMatchObject({ status: 401 })
})
