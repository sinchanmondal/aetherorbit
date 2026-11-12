import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base
        void: '#07080D',
        hull: { DEFAULT: '#0E1220', light: '#151A2C', line: '#1E2438' },
        // Accents
        ion: { DEFAULT: '#5CE1E6', dim: '#2A8F95' },
        nebula: { DEFAULT: '#8B7CF6', dim: '#5B4FC0' },
        // Text
        starlight: '#E8ECF5',
        dust: '#8A93A8',
        // Signals (used sparingly: ISRO tag, launch alerts, live badge)
        flare: '#F5B544',
        ember: '#F2708A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Classical scale (Bringhurst): 12 · 14 · 16 · 18 · 21 · 24 · 36 · 48 · 60 · 72
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        sweep: { to: { transform: 'rotate(360deg)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.7)', opacity: '0.9' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        sweep: 'sweep 9s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
