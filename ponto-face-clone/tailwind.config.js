/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        surface: 'rgba(17, 24, 39, 0.5)',
        primary: {
          DEFAULT: '#22d3ee',
          hover: '#06b6d4',
          glow: 'rgba(34, 211, 238, 0.5)'
        },
        success: '#10b981',
        danger: '#f87171',
        muted: '#9ca3af'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
