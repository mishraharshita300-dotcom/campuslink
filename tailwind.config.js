/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal: {
          50: '#f1f0ff',
          100: '#e6e4ff',
          200: '#d0ccff',
          300: '#b1aaff',
          400: '#8f86ff',
          500: '#6f63ff',
          600: '#5b50f5',
          700: '#4a40d9',
          800: '#3b34ad',
          900: '#302c88',
          950: '#211d5c',
        },
        cyan: {
          50: '#eef4ff',
          100: '#dfeaff',
          200: '#c5d8ff',
          300: '#9ebcff',
          400: '#7298ff',
          500: '#5277f5',
          600: '#3d5ee5',
          700: '#334bc1',
          800: '#2f3f9c',
          900: '#2c397b',
          950: '#1c244d',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
