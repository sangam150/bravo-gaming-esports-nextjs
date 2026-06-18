import Image from "next/image";
import Link from "next/link";
import { getSiteStats } from "@/lib/data";

export default async function AboutPage() {
  const stats = await getSiteStats();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="section-title">About Bravo Gaming</p>
          <h1 className="hero-h1 mt-3 !text-4xl">Our Journey, Mission & Vision</h1>

          <section className="mt-8">
            <h2 className="section-heading !text-lg">Our Story</h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Bravo Gaming Esports Nepal was founded with a vision to build a strong esports ecosystem in Nepal. We
              organize PUBG PC scrims, tournaments, and live events to provide a platform for talented players and
              entertain a growing community. Our dedication to fair play, competitive spirit, and community programmes
              make us one of the leading esports organizations in Nepal.
            </p>
          </section>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Our Mission",
                text: "Elevate Nepal's esports by creating opportunities, hosting professional tournaments, and representing Nepal on the global stage.",
              },
              {
                title: "Our Vision",
                text: "Become Nepal's most respected esports brand and represent Nepal on the global esports stage.",
              },
              {
                title: "Our Values",
                text: "Fair Play | Respect | Excellence | Integrity | Community",
              },
            ].map((block) => (
              <div key={block.title} className="esports-card p-4">
                <h3 className="font-display text-sm font-bold uppercase text-accent-blue">{block.title}</h3>
                <p className="mt-2 text-xs text-text-muted">{block.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: `${stats.tournamentsCompleted}+`, label: "Tournaments" },
              { value: `${stats.matchesHosted}+`, label: "Matches" },
              { value: `${stats.communityMembers.toLocaleString()}+`, label: "Community" },
              { value: stats.prizePoolsAwarded, label: "Prize Pools" },
            ].map((stat) => (
              <div key={stat.label} className="stat-pill text-center">
                <p className="font-mono-stat text-lg font-bold text-white">{stat.value}</p>
                <p className="text-label uppercase text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <Link href="/contact" className="btn-primary mt-8 inline-flex">
            Contact Us
          </Link>
        </div>

        <div className="relative min-h-[400px] overflow-hidden rounded-card border border-white/[0.08] bg-bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(29,155,240,0.15),_transparent_60%)]" />
          <Image src="/images/hero-character.svg" alt="" fill className="object-contain object-bottom p-8 opacity-80" />
        </div>
      </div>
    </main>
  );
}
