import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0e1a",
          card: "#0d1220",
          hover: "#111827",
        },
        accent: {
          blue: "#1d9bf0",
          green: "#00e676",
          red: "#f44336",
          yellow: "#ffd700",
          discord: "#5865f2",
        },
        text: {
          muted: "#8b9ab0",
        },
        bravoBlue: "#1d9bf0",
        bravoGreen: "#00e676",
        bravoRed: "#f44336",
        bravoYellow: "#ffd700",
      },
      fontFamily: {
        display: ["var(--font-barlow)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        "stat": ["28px", { lineHeight: "1.2", fontWeight: "800" }],
        "label": ["11px", { lineHeight: "1.4", letterSpacing: "0.1em" }],
        "section": ["20px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(29,155,240,0.15)",
        "glow-red": "0 0 30px rgba(244,67,54,0.25)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
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
