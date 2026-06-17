/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Anton — heavy condensed broadcast headlines & scoreboard digits.
        display: ['Anton', 'ui-sans-serif', 'sans-serif'],
        // Barlow Condensed — the sports-graphics workhorse (labels, stats, buttons).
        condensed: ['"Barlow Condensed"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        // Inter — body copy, inputs, anything that needs to read small.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Churrasco palette: ember (the flame) and coal (the grill).
        ember: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Charcoal surfaces — a mid charcoal, not near-black, so it reads
        // "lit studio" rather than "void".
        coal: {
          975: '#101015',
          950: '#17171d',
          900: '#1f1f26',
          850: '#26262e',
          800: '#2e2e37',
          700: '#3d3d47',
          600: '#52525c',
        },
      },
      letterSpacing: {
        broadcast: '0.28em',
      },
      boxShadow: {
        // Soft warm shadows — a hint of ember, no halo/bloom.
        glow: '0 6px 20px -10px rgba(249,115,22,0.22)',
        'glow-sm': '0 3px 10px -5px rgba(249,115,22,0.22)',
        'glow-lg': '0 10px 28px -14px rgba(249,115,22,0.26)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 14px 32px -24px rgba(0,0,0,0.7)',
        'inset-hi': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'ember-radial': 'radial-gradient(circle at 50% -10%, rgba(249,115,22,0.08), transparent 60%)',
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '46px 46px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        rise: 'rise 0.5s cubic-bezier(0.2,0.7,0.2,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
