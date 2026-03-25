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
      animation: {
        'slide-up':          'slideUp 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-1':        'slideUp 0.7s 0.08s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-2':        'slideUp 0.7s 0.16s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-3':        'slideUp 0.7s 0.24s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-4':        'slideUp 0.7s 0.32s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-5':        'slideUp 0.7s 0.40s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':           'fadeIn 0.5s ease-out both',
        'fade-in-1':         'fadeIn 0.5s 0.1s ease-out both',
        'float':             'float 6s ease-in-out infinite',
        'float-slow':        'float 10s ease-in-out infinite',
        'float-xs':          'floatXS 4s ease-in-out infinite',
        'shimmer-text':      'shimmerText 3s ease-in-out infinite',
        'glow-pulse':        'glowPulse 2s ease-in-out infinite',
        blob:                'blob 7s infinite',
        'gradient-shift':    'gradientShift 8s ease infinite',
        shake:               'shake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
        'spin-slow':         'spin 8s linear infinite',
        'counter':           'counterUp 1s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        floatXS: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmerText: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.08)' },
        },
        blob: {
          '0%':   { transform: 'translate(0px,0px) scale(1)' },
          '33%':  { transform: 'translate(30px,-50px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px,20px) scale(0.9)' },
          '100%': { transform: 'translate(0px,0px) scale(1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        shake: {
          '10%, 90%':   { transform: 'translate3d(-1px,0,0)' },
          '20%, 80%':   { transform: 'translate3d(2px,0,0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-3px,0,0)' },
          '40%, 60%':   { transform: 'translate3d(3px,0,0)' },
        },
      },
    },
  },
  plugins: [],
};
