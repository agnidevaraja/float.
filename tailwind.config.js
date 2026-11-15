/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          deep: '#090B0E',
          panel: '#0F1217',
          card: '#151921',
          hover: '#1C222D',
          border: '#222936',
          focused: '#374254'
        },
        brand: {
          primary: '#F1F5F9',
          muted: '#94A3B8',
          tertiary: '#64748B'
        },
        status: {
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          sky: '#38BDF8'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
