/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        atex: {
          bg: '#0a0e17',
          surface: '#111827',
          border: '#1f2937',
          primary: '#6366f1',
          accent: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
