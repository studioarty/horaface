import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-border-active)",
        ring: "var(--color-primary)",
        background: "var(--color-bg-base)",
        foreground: "var(--color-text-primary)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-bg-base)",
          dim: "var(--color-primary-dim)",
        },
        secondary: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-text-primary)",
        },
        destructive: {
          DEFAULT: "var(--color-error)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--color-bg-elevated)",
          foreground: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-bg-elevated)",
          foreground: "var(--color-text-primary)",
        },
        card: {
          DEFAULT: "var(--color-bg-surface)",
          foreground: "var(--color-text-primary)",
        },
        popover: {
          DEFAULT: "var(--color-bg-surface)",
          foreground: "var(--color-text-primary)",
        },
        surface: "var(--color-bg-surface)",
        elevated: "var(--color-bg-elevated)",
        brand: "var(--color-brand)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
      },
      fontFamily: {
        heading: ["Rajdhani", "system-ui", "sans-serif"],
        body: ["Exo 2", "system-ui", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "var(--glow-primary)",
        "glow-success": "var(--glow-success)",
        "glow-error": "0 0 20px rgba(239, 68, 68, 0.3)",
        "glow-warning": "0 0 20px rgba(245, 158, 11, 0.3)",
        hud: "0 0 0 1px var(--color-border), 0 4px 24px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "scan-line": {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "scan-line": "scan-line 2s ease-in-out infinite alternate",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "fade-up": "fade-up 0.4s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
