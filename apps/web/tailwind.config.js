/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        ui: {
          950: '#050706',
          900: '#090e0d',
          800: '#101816',
          700: '#1b2824',
          600: '#2c3f39',
          500: '#53645e',
          400: '#84948e',
          300: '#b7c3bd',
          200: '#dbe3df',
          100: '#f2f6f3',
          50: '#fbfdfb',
        },
        brand: {
          50: '#ecfdf7',
          100: '#d1faeb',
          200: '#a6f4d4',
          300: '#6ee7be',
          400: '#3bd4a8',
          500: '#18b98e',
          600: '#0d9574',
          700: '#0c765f',
          800: '#0d5d4d',
          900: '#0d4d41',
          950: '#062d27',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.4s infinite ease-in-out both',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        typing: {
          '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
