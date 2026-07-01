/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        void: '#050514',
        cyan: '#00E3FF',
        iris: '#A855F7',
        fuchsia: '#EC4899',
        gold: '#FFD700',
        ember: '#FF8C42',
        surface1: '#0D0D1A',
        surface2: '#14142B',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      fontSize: {
        display: ['24px', { lineHeight: '32px' }],
        title: ['18px', { lineHeight: '26px' }],
        heading: ['14px', { lineHeight: '20px' }],
        body: ['12px', { lineHeight: '18px' }],
        caption: ['10px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
}
