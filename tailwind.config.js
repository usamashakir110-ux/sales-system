/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
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
      }
    },
  },
  plugins: [],
}
