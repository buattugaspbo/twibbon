import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './submit.html',
    './admin/**/*.html',
    './src/**/*.{ts,html}',
  ],
  theme: {
    extend: {
      colors: {
        ump: {
          yellow: '#F5C518',
          'yellow-dark': '#D4A800',
        },
        ti: {
          cyan: '#0EA5E9',
          'cyan-dark': '#0369A1',
        },
        ink: '#0F172A',
        surface: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        ig: '935px',
      },
    },
  },
  plugins: [],
} satisfies Config;