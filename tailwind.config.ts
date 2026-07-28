import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#020812",
          secondary: "#030A13",
          card: "#071321",
          hover: "#091827",
        },
        accent: {
          blue: "#0B6CFF",
          "blue-light": "#2F8CFF",
          "blue-dark": "#0755CE",
          green: "#22C55E",
          red: "#EF4444",
          yellow: "#F59E0B",
          discord: "#5865f2",
        },
        text: {
          primary: "#F5F8FC",
          secondary: "#AAB6C6",
          muted: "#728196",
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
        stat: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        label: ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
        section: ["24px", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "6px",
        btn: "4px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(11,108,255,0.22)",
        "glow-red": "0 0 18px rgba(239,68,68,0.18)",
        card: "0 12px 36px rgba(0,0,0,0.22)",
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
