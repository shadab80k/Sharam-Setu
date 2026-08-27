import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#071B33",
          800: "#0B2747",
          700: "#12385E",
        },
        orange: {
          600: "#D84315",
          500: "#E64A19",
          100: "#FFF0E8",
        },
        cream: {
          50: "#FCFAF6",
          100: "#F7F3EA",
        },
        green: {
          600: "#137B3E",
          100: "#E8F6ED",
        },
        blue: {
          600: "#2367C9",
          100: "#EAF2FF",
        },
        purple: {
          600: "#7047C6",
          100: "#F1ECFF",
        },
        red: {
          600: "#D92D20",
          100: "#FDECEA",
        },
        amber: {
          600: "#C77A00",
          100: "#FFF4D6",
        },
        gray: {
          900: "#182230",
          700: "#475467",
          600: "#667085",
          500: "#98A2B3",
          300: "#D0D5DD",
          200: "#EAECF0",
          100: "#F2F4F7",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(16, 24, 40, 0.06)",
        elevated: "0 8px 24px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        card: "16px",
        panel: "20px",
        hero: "24px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "check-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "check-pop": "check-pop 0.4s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
