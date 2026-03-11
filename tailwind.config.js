/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#0a0a0a',
        foreground: '#fafafa',
        card: {
          DEFAULT: '#141414',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#141414',
          foreground: '#fafafa',
        },
        primary: {
          DEFAULT: '#14b8a6',
          foreground: '#042f2e',
        },
        secondary: {
          DEFAULT: '#1f1f1f',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#262626',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#1f1f1f',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fafafa',
        },
        border: '#27272a',
        input: '#27272a',
        ring: '#14b8a6',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'zoom-in-95': {
          from: { transform: 'scale(0.95)' },
          to: { transform: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(1.25rem)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'zoom-in': 'zoom-in-95 150ms ease-out',
        'slide-in': 'slide-in-from-bottom 200ms ease-out',
      },
    },
  },
  plugins: [],
}

