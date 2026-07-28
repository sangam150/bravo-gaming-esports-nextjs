import HomePage from "@/components/home/HomePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Bravo Gaming Esports | PUBG PC Events and Results in Nepal",
  },
  description:
    "Browse published Bravo Gaming Esports PUBG PC scrims, tournaments, results, leaderboards, player statistics, team rankings, and community updates.",
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
    title: "Bravo Gaming Esports | PUBG PC Events and Results in Nepal",
    description: "Browse published PUBG PC events, results, teams, players, rankings, and community updates from Bravo Gaming Esports.",
    images: [
      {
        url: "/images/bravo-logo.png",
        alt: "Bravo Gaming Esports",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bravo Gaming Esports | PUBG PC Events and Results in Nepal",
    description: "Browse published PUBG PC events, results, teams, players, rankings, and community updates from Bravo Gaming Esports.",
    images: ["/images/bravo-logo.png"],
  },
};

export default function Home() {
  return <HomePage />;
}
