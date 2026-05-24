import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        glass: "rgba(255, 255, 255, 0.10)",
      },
      backgroundImage: {
        "theme-default": "linear-gradient(135deg, rgba(75,0,130,0.55), rgba(128,0,128,0.45), rgba(0,0,255,0.40))",
        "theme-sunset":  "linear-gradient(135deg, rgba(255,140,0,0.55), rgba(255,105,180,0.45), rgba(128,0,128,0.40))",
        "theme-forest":  "linear-gradient(135deg, rgba(34,139,34,0.55), rgba(60,179,113,0.45), rgba(0,128,128,0.40))",
        "theme-ocean":   "linear-gradient(135deg, rgba(0,255,255,0.55), rgba(0,0,255,0.45), rgba(75,0,130,0.40))",
        "theme-midnight":"linear-gradient(135deg, rgba(0,0,0,0.95), rgba(80,80,80,0.55))",
      },
    },
  },
  plugins: [],
};

export default config;
