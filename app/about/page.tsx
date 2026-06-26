import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

const pillars = [
  {
    title: "Daily PUBG PC Scrims",
    detail:
      "Daily scrim operations that keep players and teams active, competitive, and ready for official tournament play.",
  },
  {
    title: "Competitive Tournaments",
    detail:
      "Structured competitions with clear scheduling, scoring, and result coverage built for Nepal&apos;s PUBG PC scene.",
  },
  {
    title: "Live Leaderboards & Analytics",
    detail:
      "Real-time rankings, team standings, and match statistics that help competitors track progress and performance.",
  },
] as const;

const commitments = [
  "Team and player rankings that showcase competitive progress.",
  "Match statistics and analytics for deeper performance tracking.",
  "Community events and tournament coverage with esports news.",
  "Professional event management to support sustainable growth in Nepal esports.",
] as const;

export const metadata: Metadata = buildContentMetadata({
  title: "About Bravo Gaming Esports",
  description:
    "Bravo Gaming Esports is a competitive esports organization based in Nepal, focused on building and supporting the PUBG PC ecosystem through scrims, tournaments, community events, and rankings.",
  path: "/about",
  type: "website",
});

export default function AboutPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
            <div>
              <p className="section-title">About Bravo</p>
              <h1 className="mt-4 font-display text-4xl font-black uppercase text-white sm:text-5xl">
                About Bravo
                <br />
                Gaming Esports
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                Bravo Gaming Esports is a competitive esports organization based in Nepal, focused on building and
                supporting the PUBG PC esports ecosystem through daily scrims, tournaments, community events, and
                competitive rankings.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pubg" className="btn-primary">
                  Open PUBG Hub
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
                <a href={BRAVO_INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                  Follow Instagram
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <p className="section-title">Official Channels</p>
              <div className="mt-5 grid gap-3">
                <a
                  href={BRAVO_INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  Instagram | @bravo_esport
                </a>
                <a
                  href={BRAVO_DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  Discord | Official community server
                </a>
                <Link
                  href="/contact"
                  className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  Contact | Reach the Bravo team directly
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="esports-card p-6">
              <h2 className="font-display text-xl font-black uppercase text-white">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{pillar.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="esports-card p-6">
            <p className="section-title">What Bravo Stands For</p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">What We Offer</h2>
            <div className="mt-5 grid gap-3">
              {commitments.map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <p className="section-title">Community</p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Vision & Community</h2>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              Our vision is to become one of Nepal&apos;s leading esports organizations and a trusted platform for
              competitive gaming, helping players and teams grow through organized events and community engagement.
              Bravo welcomes players of all skill levels and aims to create a fair, competitive, and enjoyable
              environment for everyone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pubg/community" className="btn-primary">
                Open Community
              </Link>
              <Link href="/news" className="btn-secondary">
                Read News
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
