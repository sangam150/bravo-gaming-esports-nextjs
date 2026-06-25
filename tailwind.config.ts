import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#05070B",
          secondary: "#0A1020",
          card: "#101827",
          hover: "#121D33",
        },
        accent: {
          blue: "#1E7BFF",
          "blue-light": "#0EA5FF",
          "blue-dark": "#0A5CD8",
          green: "#22C55E",
          red: "#EF4444",
          yellow: "#F59E0B",
          discord: "#5865f2",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A8B3CF",
          muted: "#6B7280",
        },
        bravoBlue: "#1E7BFF",
        bravoGreen: "#22C55E",
        bravoRed: "#EF4444",
        bravoYellow: "#F59E0B",
      },
      fontFamily: {
        display: ["var(--font-barlow)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        "stat": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "label": ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
        "section": ["24px", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "18px",
        btn: "12px",
      },
      boxShadow: {
        glow: "0 0 34px rgba(30,123,255,0.35)",
        "glow-red": "0 0 24px rgba(239,68,68,0.24)",
        card: "0 24px 80px rgba(0,0,0,0.35)",
      },
      animation: {
        "pulse-live": "livePulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
