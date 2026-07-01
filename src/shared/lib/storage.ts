import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  },
  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key)
  },
}

export const STORAGE_KEYS = {
  ONBOARDED: 'quizly.onboarded',
  GUEST_ID: 'quizly.guestId',
} as const
