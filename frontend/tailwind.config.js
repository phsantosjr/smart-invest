/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A249D',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#009FBD',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F9E2AF',
          foreground: '#1a1a1a',
        },
        surface: {
          DEFAULT: '#F6F5F5',
          dark: '#1a1a22',
        },
      },
    },
  },
  plugins: [],
}