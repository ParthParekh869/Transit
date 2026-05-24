import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          50:  "#f6f7fb",
          100: "#e7e9f2",
          200: "#cbcfdf",
          300: "#9aa1bd",
          400: "#6c7396",
          500: "#4b5278",
          600: "#363b5a",
          700: "#252946",
          800: "#161a31",
          900: "#0a0e1f",
          950: "#070914",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px -8px rgba(0,0,0,0.5)",
        "glow-lg": "0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px -16px rgba(0,0,0,0.6)",
        "inner-top": "inset 0 1px 0 rgba(255,255,255,0.10)",
      },
      keyframes: {
        "drift-1": {
          "0%, 100%":   { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%":        { transform: "translate3d(8vw, 6vh, 0) scale(1.08)" },
        },
        "drift-2": {
          "0%, 100%":   { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%":        { transform: "translate3d(-7vw, 8vh, 0) scale(1.05)" },
        },
        "drift-3": {
          "0%, 100%":   { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%":        { transform: "translate3d(5vw, -6vh, 0) scale(1.1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "live-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(244, 63, 94, 0.55)" },
          "50%":      { boxShadow: "0 0 0 10px rgba(244, 63, 94, 0)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "drift-1":   "drift-1 28s ease-in-out infinite",
        "drift-2":   "drift-2 34s ease-in-out infinite",
        "drift-3":   "drift-3 40s ease-in-out infinite",
        shimmer:     "shimmer 1.6s linear infinite",
        "live-pulse":"live-pulse 1.6s ease-out infinite",
        "fade-up":   "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
