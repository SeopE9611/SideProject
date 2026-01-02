import { type Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', 'node_modules/react-day-picker/dist/style.css'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /**
       * 반응형 기준(벤치마크: Tennis Warehouse)
       * - bp-sm: 576+
       * - bp-md: 768+
       * - bp-lg: 1200+
       * - bp-xs: ~575
       * - bp-sm-only: 576~767
       * - bp-md-only: 768~1199
       *
       * 기존 sm/md/lg는 유지(전역 깨짐 방지)하고,
       * 메인/헤더/푸터부터 bp-* 기준으로 점진적 이관한다.
       */
      screens: {
        'bp-xs': { max: '575px' },
        'bp-sm': '576px',
        'bp-md': '768px',
        'bp-lg': '1200px',
        'bp-sm-only': { min: '576px', max: '767px' },
        'bp-md-only': { min: '768px', max: '1199px' },
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // popover 색상 매핑
        popover: 'rgb(var(--popover))',
        'popover-foreground': 'rgb(var(--popover-foreground))',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};

export default config;
