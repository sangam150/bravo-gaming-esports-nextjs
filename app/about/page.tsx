import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

const pillars = [
  {
    title: "Flagship PUBG Coverage",
    detail:
      "Bravo leads with PUBG PC, bringing seasons, events, teams, players, standings, and match reporting into one public home.",
  },
  {
    title: "Verified Publishing",
    detail:
      "Public results, rankings, community updates, sponsors, and media are meant to reflect official Bravo coverage, not filler content.",
  },
  {
    title: "Built For Growth",
    detail:
      "Future support for more titles will open only when real events, teams, and coverage are ready for public launch.",
  },
] as const;

const commitments = [
  "Publish clear, match-backed competition coverage for Nepal esports.",
  "Keep teams, players, fans, sponsors, and organizers connected through one reliable platform.",
  "Prioritize fast navigation, clean mobile browsing, and professional presentation.",
  "Expand into new titles only when Bravo can support them with genuine public coverage.",
] as const;

export const metadata: Metadata = buildContentMetadata({
  title: "About Bravo Gaming Esports",
  description: "Learn how Bravo Gaming Esports is building Nepal's home for competitive esports with PUBG PC as the flagship ecosystem.",
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
                Nepal&apos;s home for
                <br />
                competitive esports
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                Bravo Gaming Esports is building a trustworthy public platform for Nepal esports, with PUBG PC as the
                flagship ecosystem and room to grow into more titles as real coverage expands.
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
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Reliable public coverage</h2>
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
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Follow the next update</h2>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              Bravo&apos;s public community route keeps official updates, team discovery, player browsing, and support
              close together so the platform stays easy to trust and easy to use.
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
