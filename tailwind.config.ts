import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#effcf6",
          100: "#d3f4e4",
          200: "#a9e8cd",
          300: "#72d5b0",
          400: "#3dbb90",
          500: "#1aa079",
          600: "#0f8163",
          700: "#0d6751",
          800: "#0e5242",
          900: "#0d4438",
        },
      },
      keyframes: {
        "pulse-move": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(26,160,121,0.0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(26,160,121,0.35)" },
        },
      },
      animation: {
        "pulse-move": "pulse-move 1.2s ease-in-out 2",
      },
    },
  },
  plugins: [],
};

export default config;
