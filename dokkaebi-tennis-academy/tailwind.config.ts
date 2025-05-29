import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true, // 가로 중앙정렬
      padding: '2rem', // 좌우 패딩: 2rem (기존 container 기본)
      screens: {
        sm: '100%', // 모바일부터 풀폭
        md: '100%', // 태블릿도 풀폭
        lg: '100%', // 데스크탑도 풀폭
        xl: '100%', // 중대형 데스크탑도 풀폭
        '2xl': '1400px', // 초대형 화면에서만 max-width: 1400px
      },
    },
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: '#3b82f6',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
