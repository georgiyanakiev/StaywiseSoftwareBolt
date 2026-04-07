/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef3f9',
          100: '#d5e4f0',
          200: '#adc9e2',
          300: '#7aaac9',
          400: '#4e8bb2',
          500: '#2d6b96',
          600: '#1e3a5f',
          700: '#172e4c',
          800: '#112239',
          900: '#0b1726',
          950: '#060c14',
        },
      },
    },
  },
  plugins: [],
};
