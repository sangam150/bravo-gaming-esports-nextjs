import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { MotionObserver, RouteTransition } from "@/components/ui/MotionSystem";
import { getSiteUrl } from "@/lib/site";

const displayFont = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jetbrains",
});

const siteUrl = getSiteUrl();
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Bravo Gaming Esports",
      url: siteUrl,
      logo: `${siteUrl}/images/bravo-logo.png`,
      sameAs: ["https://www.youtube.com/@bravogamingnepal7981"],
    },
    {
      "@type": "WebSite",
      name: "Bravo Gaming Esports",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

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
    icon: "/images/bravo-logo.png",
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
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} flex min-h-screen flex-col overflow-x-hidden bg-bg-primary font-body text-white antialiased`}
      >
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-white px-4 py-2 font-semibold text-bg-primary shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2 focus:ring-offset-bg-primary"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <div id="main-content" className="flex-1" tabIndex={-1}>
          <RouteTransition>{children}</RouteTransition>
        </div>
        <MotionObserver />
        <Footer />
      </body>
    </html>
  );
}
