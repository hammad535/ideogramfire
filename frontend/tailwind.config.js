/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        glass: 'var(--glass-bg, rgba(15, 23, 42, 0.6))',
        'glass-border': 'var(--glass-border, rgba(255, 255, 255, 0.08))',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
      },
    },
  },
  plugins: [],
};
