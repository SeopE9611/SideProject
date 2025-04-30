// Tailwind CSS 4 호환 shadcn 플러그인
const plugin = require("tailwindcss/plugin")

exports.shadcnPlugin = plugin(
  ({ addBase }) => {
    addBase({
      ":root": {
        "--background": "#ffffff",
        "--foreground": "#0f172a",
        "--card": "#ffffff",
        "--card-foreground": "#0f172a",
        "--popover": "#ffffff",
        "--popover-foreground": "#0f172a",
        "--primary": "#3b82f6",
        "--primary-foreground": "#ffffff",
        "--secondary": "#f1f5f9",
        "--secondary-foreground": "#1e293b",
        "--muted": "#f1f5f9",
        "--muted-foreground": "#64748b",
        "--accent": "#f1f5f9",
        "--accent-foreground": "#1e293b",
        "--destructive": "#ef4444",
        "--destructive-foreground": "#ffffff",
        "--border": "#e2e8f0",
        "--input": "#e2e8f0",
        "--ring": "#3b82f6",
        "--radius": "0.5rem",
      },
      ".dark": {
        "--background": "#0f172a",
        "--foreground": "#f8fafc",
        "--card": "#0f172a",
        "--card-foreground": "#f8fafc",
        "--popover": "#0f172a",
        "--popover-foreground": "#f8fafc",
        "--primary": "#3b82f6",
        "--primary-foreground": "#0f172a",
        "--secondary": "#1e293b",
        "--secondary-foreground": "#f8fafc",
        "--muted": "#1e293b",
        "--muted-foreground": "#94a3b8",
        "--accent": "#1e293b",
        "--accent-foreground": "#f8fafc",
        "--destructive": "#b91c1c",
        "--destructive-foreground": "#f8fafc",
        "--border": "#1e293b",
        "--input": "#1e293b",
        "--ring": "#3b82f6",
      },
    })
  },
  {
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
    },
  },
)
