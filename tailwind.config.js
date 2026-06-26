/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#070b12',
        panel: '#0e1420',
        card: '#151c2b',
        'card-hover': '#1b2334',
        edge: '#232c3e',
        ink: '#e7ecf5',
        muted: '#8a94a8',
        good: '#34d399',
        bad: '#f87171',
        warn: '#fbbf24',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
