export const colors = {
  void: '#050514',
  cyan: '#00E3FF',
  iris: '#A855F7',
  fuchsia: '#EC4899',
  gold: '#FFD700',
  ember: '#FF8C42',
  surface1: '#0D0D1A',
  surface2: '#14142B',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.4)',
} as const

export type ColorToken = keyof typeof colors
