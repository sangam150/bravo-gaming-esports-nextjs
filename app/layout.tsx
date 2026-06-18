import "./globals.css";
import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans, JetBrains_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getSiteUrl } from "@/lib/site";

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

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Bravo Gaming Esports",
  title: {
    default: "Bravo Gaming Esports | Nepal's Premier Esports Platform",
    template: "%s | Bravo Gaming Esports",
  },
  description:
    "Bravo Gaming Esports is Nepal's premier esports platform for games, events, matches, teams, players, rankings, media, sponsors, and community coverage.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Bravo Gaming Esports",
    "Nepal esports",
    "PUBG PC Nepal",
    "Valorant Nepal",
    "CS2 Nepal",
    "esports tournaments Nepal",
    "Nepal esports rankings",
    "Bravo Gaming live stream",
  ],
  icons: {
    icon: "/images/bravo-logo.svg",
    apple: "/images/bravo-logo.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Bravo Gaming Esports",
    title: "Bravo Gaming Esports | Nepal's Premier Esports Platform",
    description:
      "Follow games, events, matches, teams, players, rankings, media, sponsors, and community coverage from Nepal's premier esports platform.",
    images: [
      {
        url: "/images/bravo-logo.png",
        width: 1200,
        height: 1200,
        alt: "Bravo Gaming Esports",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bravo Gaming Esports | Nepal's Premier Esports Platform",
    description:
      "Follow games, events, matches, teams, players, rankings, media, sponsors, and community coverage from Nepal's premier esports platform.",
    images: ["/images/bravo-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-bg-primary font-body text-white antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
