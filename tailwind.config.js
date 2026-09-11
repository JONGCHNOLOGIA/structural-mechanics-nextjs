/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        crimson: '#C3002F',
        crimsonSoft: '#F7E3E6',
        teal: '#1E7F72',
        tealSoft: '#E1F2EF',
        gray: '#51626F',
        graySoft: '#8A97A2',
        bg: '#FAF9F6',
        line: '#EAE7E0',
        ink: '#3A3A3A',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
