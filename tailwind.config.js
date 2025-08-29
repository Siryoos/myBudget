/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '320px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          'trust-blue': 'rgb(var(--color-primary-trust-blue) / <alpha-value>)',
          'trust-blue-light': 'rgb(var(--color-primary-trust-blue-light) / <alpha-value>)',
          'trust-blue-dark': 'rgb(var(--color-primary-trust-blue-dark) / <alpha-value>)',
        },
        secondary: {
          'growth-green': 'rgb(var(--color-secondary-growth-green) / <alpha-value>)',
          'growth-green-light': 'rgb(var(--color-secondary-growth-green-light) / <alpha-value>)',
          'growth-green-dark': 'rgb(var(--color-secondary-growth-green-dark) / <alpha-value>)',
        },
        neutral: {
          white: 'rgb(var(--color-neutral-white) / <alpha-value>)',
          'light-gray': 'rgb(var(--color-neutral-light-gray) / <alpha-value>)',
          gray: 'rgb(var(--color-neutral-gray) / <alpha-value>)',
          'dark-gray': 'rgb(var(--color-neutral-dark-gray) / <alpha-value>)',
          black: 'rgb(var(--color-neutral-black) / <alpha-value>)',
        },
        accent: {
          'action-orange': 'rgb(var(--color-accent-action-orange) / <alpha-value>)',
          'warning-red': 'rgb(var(--color-accent-warning-red) / <alpha-value>)',
          'success-emerald': 'rgb(var(--color-accent-success-emerald) / <alpha-value>)',
        },
      },
      fontFamily: {
        primary: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        secondary: ['Roboto', 'sans-serif'],
        numeric: ['Roboto Mono', 'monospace'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '50%',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'celebrate': 'celebrate 0.6s ease-in-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        celebrate: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
