import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        flore: {
          primary: 'var(--flore-primary)',
          'primary-dark': 'var(--flore-primary-dark)',
          gold: 'var(--flore-gold)',
          'gold-dark': 'var(--flore-gold-dark)',
          bg: 'var(--flore-bg)',
          'bg-alt': 'var(--flore-bg-alt)',
          card: 'var(--flore-card)',
          subtle: 'var(--flore-subtle)',
          sage: 'var(--flore-sage)',
          blush: 'var(--flore-blush)',
          'blush-deep': 'var(--flore-blush-deep)',
          'text-primary': 'var(--flore-text-primary)',
          'text-secondary': 'var(--flore-text-secondary)',
          border: 'var(--flore-border)',
          success: 'var(--flore-success)',
          error: 'var(--flore-error)',
          warning: 'var(--flore-warning)',
        },
      },
      fontFamily: {
        amiri: ['var(--font-amiri)', 'serif'],
        noto: ['var(--font-noto)', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        luxury: 'var(--flore-shadow)',
        'luxury-hover': 'var(--flore-shadow-hover)',
        'luxury-soft': 'var(--flore-shadow-soft)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
      transitionTimingFunction: {
        flore: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 280ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'fade-in': 'fade-in 300ms ease-out both',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
