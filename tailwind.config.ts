import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171512',
        paper: '#FBF9F6',
        canvas: '#F3EFE8',
        line: '#E4DDD1',
        moss: '#3C4A3E',
        clay: '#B5654A',
        gold: '#B9924A'
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif']
      },
      borderRadius: {
        card: '20px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,21,18,0.04), 0 8px 24px -12px rgba(23,21,18,0.12)'
      }
    }
  },
  plugins: []
};

export default config;
