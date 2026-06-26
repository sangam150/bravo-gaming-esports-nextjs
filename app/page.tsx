import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "Bravo Gaming Esports | PUBG PC Scrims & Tournaments in Nepal",
  description:
    "Nepal's competitive PUBG PC esports platform featuring daily scrims, tournaments, live leaderboards, player statistics, team rankings, and community events.",
  keywords: [
    "PUBG PC Nepal",
    "Nepal Esports",
    "PUBG Tournament Nepal",
    "PUBG Scrims Nepal",
    "Bravo Gaming Esports",
    "PUBG Leaderboards",
    "PUBG Team Rankings",
    "PUBG Player Statistics",
    "Competitive Gaming Nepal",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Bravo Gaming Esports - Nepal's PUBG PC Esports Platform",
    description: "Join daily scrims, tournaments, and the competitive PUBG PC community in Nepal.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bravo Gaming Esports - Nepal's PUBG PC Esports Platform",
    description: "Join daily scrims, tournaments, and the competitive PUBG PC community in Nepal.",
  },
};

export default function Home() {
  return <HomePage />;
}
