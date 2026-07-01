import { TextStyle } from 'react-native'

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 24, lineHeight: 32, fontFamily: 'Inter_700Bold' },
  title:   { fontSize: 18, lineHeight: 26, fontFamily: 'Inter_600SemiBold' },
  heading: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
  body:    { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  caption: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular' },
}

export type TypographyVariant = keyof typeof typography
