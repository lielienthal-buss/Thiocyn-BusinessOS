/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf6ec',
          100: '#faecd4',
          200: '#f5d9a9',
          300: '#efc07a',
          400: '#e8aa52',
          500: '#E09B37',
          600: '#c8832a',
          700: '#a66a22',
          800: '#85531b',
          900: '#6b4216',
          950: '#3d2509',
        },
        secondary: {
          500: '#334FB4',
          600: '#2a3f91',
          700: '#1f2f6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
