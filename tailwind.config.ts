import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#05070D",
          secondary: "#0A1020",
          card: "#10182B",
          hover: "#121D33",
        },
        accent: {
          blue: "#147EF5",
          "blue-light": "#2F98FF",
          "blue-dark": "#0850B2",
          green: "#16A34A",
          red: "#DC2626",
          yellow: "#EAB308",
          discord: "#5865f2",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#C3CBD8",
          muted: "#7A8599",
        },
        bravoBlue: "#147EF5",
        bravoGreen: "#16A34A",
        bravoRed: "#DC2626",
        bravoYellow: "#EAB308",
      },
      fontFamily: {
        display: ["var(--font-barlow)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        "stat": ["28px", { lineHeight: "1.2", fontWeight: "800" }],
        "label": ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
        "section": ["20px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        card: "20px",
        btn: "12px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(20,126,245,0.18)",
        "glow-red": "0 0 30px rgba(220,38,38,0.22)",
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
