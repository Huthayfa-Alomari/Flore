import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flore: {
          primary: "var(--flore-primary)",
          "primary-dark": "var(--flore-primary-dark)",
          gold: "var(--flore-gold)",
          "gold-dark": "var(--flore-gold-dark)",
          bg: "var(--flore-bg)",
          card: "var(--flore-card)",
          subtle: "var(--flore-subtle)",
          "text-primary": "var(--flore-text-primary)",
          "text-secondary": "var(--flore-text-secondary)",
          border: "var(--flore-border)",
          success: "var(--flore-success)",
          error: "var(--flore-error)",
          warning: "var(--flore-warning)",
        },
      },
      fontFamily: {
        amiri: ["var(--font-amiri)"],
        noto: ["var(--font-noto)"],
        playfair: ["var(--font-playfair)"],
        inter: ["var(--font-inter)"],
      },
      boxShadow: {
        luxury: "var(--flore-shadow)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        marquee: "marquee 25s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;


