/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}", // ищем в корне
  ],
  theme: {
    extend: {
      colors: {
        'reaper': {
          'bg': '#070d0a',
          'surface': '#0f1a14',
          'border': '#1a2e24',
          'green': '#2e7d5b',
          'glow': '#3fae7a',
          'text': '#d8e8de',
          'muted': '#6b8578',
          'gold': '#c9a54b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-green': '0 0 20px rgba(63, 174, 122, 0.15)',
      },
    },
  },
  plugins: [],
}
