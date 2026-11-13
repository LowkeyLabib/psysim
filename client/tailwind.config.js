/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        psysim: {
          navy: '#14213D',
          'navy-dark': '#0B1323',
          'navy-light': '#1E2F56',
          cream: '#F4EDE0',
          'cream-light': '#FAF6F0',
          coral: '#FF6B5B',
          'coral-hover': '#E55848',
          'coral-light': '#FFEBE8',
          paper: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Kalpurush',
          'Siyam Rupali',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
