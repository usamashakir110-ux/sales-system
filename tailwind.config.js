/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-display)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#e0faff',
          100: '#b3f3ff',
          200: '#80ebff',
          300: '#4de3ff',
          400: '#00d4ff',
          500: '#00b8e0',
          600: '#0099cc',
          700: '#007aaa',
          800: '#005c88',
          900: '#003d66',
        },
        accent: {
          50:  '#e0fff3',
          100: '#b3ffe2',
          200: '#80ffd0',
          300: '#4dffbe',
          400: '#00ff9d',
          500: '#00e088',
          600: '#00cc7a',
          700: '#00aa63',
          800: '#00884d',
          900: '#006636',
        }
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fill-bar': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        pulse: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        'neon-pulse': {
          '0%,100%': { boxShadow: '0 0 10px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(0,212,255,0.6), 0 0 50px rgba(0,255,157,0.2)' },
        }
      },
      animation: {
        flicker: 'flicker 1.5s ease-in-out infinite',
        'flicker-fast': 'flicker 0.6s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'pop-in': 'pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'fill-bar': 'fill-bar 1s ease-out forwards',
        confetti: 'confetti 3s ease-in forwards',
        pulse: 'pulse 2s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
