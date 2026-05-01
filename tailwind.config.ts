import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0f0d1a",
        card: "#1a1730",
        elevated: "#221f38",
        border: "#2e2a4a",
        mint: "#00e5c3",
        "mint-dim": "#00b89c",
        purple: "#3b2f6e",
        "purple-light": "#5a4a9e",
        muted: "#8b80b0",
        danger: "#ff4f6d",
        warn: "#ffb547",
      },
      fontFamily: {
        display: ["Exo 2", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
