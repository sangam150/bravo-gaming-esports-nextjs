import "./globals.css";
import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans, JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Bravo Gaming Esports | PUBG PC Scrims • Tournaments • Live Streaming",
  description: "Bravo Gaming Esports Nepal official portal for PUBG PC scrims, tournaments, broadcasts, leaderboard rankings, and community engagement.",
  icons: { icon: "/images/bravo-logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-bg-primary font-body text-white antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
