import { type Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "node_modules/react-day-picker/dist/style.css",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.75rem", // 12px (모바일)
        sm: "1rem", // 16px
        md: "1.5rem", // 24px
        lg: "2rem", // 32px (데스크탑)
      },
      screens: { "2xl": "1400px" },
    },
    fontSize: {
      xs: ["0.875rem", { lineHeight: "1.25rem" }],
      sm: ["1rem", { lineHeight: "1.5rem" }],
      base: ["1.125rem", { lineHeight: "1.75rem" }],
      lg: ["1.25rem", { lineHeight: "1.75rem" }],
      xl: ["1.375rem", { lineHeight: "1.875rem" }],
      "2xl": ["1.625rem", { lineHeight: "2rem" }],
      "3xl": ["2rem", { lineHeight: "2.25rem" }],
      "4xl": ["2.375rem", { lineHeight: "2.625rem" }],
      "5xl": ["3.125rem", { lineHeight: "1.1" }],
      "6xl": ["3.875rem", { lineHeight: "1.1" }],
      "7xl": ["4.625rem", { lineHeight: "1.05" }],
      "8xl": ["6rem", { lineHeight: "1" }],
      "9xl": ["8rem", { lineHeight: "1" }],
      "ui-micro": ["0.6875rem", { lineHeight: "0.875rem" }], // 11px
      "ui-caption": ["0.75rem", { lineHeight: "1rem" }], // 12px
      "ui-label": ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
      "ui-body-sm": ["0.875rem", { lineHeight: "1.5rem" }], // 14px
      "ui-body": ["0.9375rem", { lineHeight: "1.625rem" }], // 15px
      "ui-body-lg": ["1rem", { lineHeight: "1.625rem" }], // 16px
      "ui-card-title": ["1rem", { lineHeight: "1.375rem" }], // 16px
      "ui-card-title-lg": ["1.0625rem", { lineHeight: "1.5rem" }], // 17px
      "ui-section-title": ["1.25rem", { lineHeight: "1.75rem" }], // 20px
      "ui-section-title-lg": ["1.5rem", { lineHeight: "2rem" }], // 24px
      "ui-page-title": ["1.5rem", { lineHeight: "1.875rem" }], // 24px
      "ui-page-title-lg": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
      "ui-price": ["1.125rem", { lineHeight: "1.5rem" }], // 18px
      "ui-price-lg": ["1.5rem", { lineHeight: "1.875rem" }], // 24px
      "ui-input": ["1rem", { lineHeight: "1.5rem" }], // 16px
      "ui-kicker": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.16em" }],
      "ui-display": ["clamp(2.75rem, 12vw, 5.5rem)", { lineHeight: "0.95", letterSpacing: "-0.06em" }],
      "ui-display-lg": ["clamp(4.5rem, 10vw, 9rem)", { lineHeight: "0.9", letterSpacing: "-0.07em" }],
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
        "bp-xxs": { max: "360px" },
        "bp-xs": { max: "575px" },
        "bp-sm": "576px",
        "bp-md": "768px",
        "bp-lg": "1200px",
        "bp-xl": "1400px",
        "bp-2xl": "1500px",
        "bp-3xl": "1800px",
        "bp-sm-only": { min: "576px", max: "767px" },
        "bp-md-only": { min: "768px", max: "1199px" },
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        overlay: "hsl(var(--overlay))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "brand-text": "hsl(var(--brand-text))",
        "brand-highlight": {
          DEFAULT: "hsl(var(--brand-highlight))",
          foreground: "hsl(var(--brand-highlight-foreground))",
          muted: "hsl(var(--brand-highlight-muted))",
        },
        "surface-inverse": {
          DEFAULT: "hsl(var(--surface-inverse))",
          foreground: "hsl(var(--surface-inverse-foreground))",
          muted: "hsl(var(--surface-inverse-muted))",
        },
        "outline-text": "hsl(var(--outline-text))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
          active: "hsl(var(--accent-active))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        control: "0.75rem",
        panel: "1.5rem",
        hero: "2rem",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        float: "var(--shadow-float)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
