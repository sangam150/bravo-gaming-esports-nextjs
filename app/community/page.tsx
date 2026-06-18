import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero, SectionHeader } from "@/components/pubg/PubgHubUI";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = {
  title: "Community",
  description: "Bravo Gaming Esports community hub for Discord, announcements, rules, support, FAQ, and ecosystem participation.",
};

export const revalidate = 300;

export default async function CommunityPage() {
  const hub = await getPlatformHubData();
  const announcements = hub.news.slice(0, 4);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Community"
          title={
            <>
              The public home of
              <br />
              Nepal esports community
            </>
          }
          description="Bravo's community route is designed for players, teams, organizers, sponsors, and fans who need announcements, support, rules, Discord access, and clear paths into the wider ecosystem."
          actions={
            <>
              <a href="https://kamaucha.me/bravo" target="_blank" rel="noreferrer" className="btn-discord">
                Join Discord
              </a>
              <Link href="/news" className="btn-primary">
                Announcements
              </Link>
              <Link href="/contact" className="btn-secondary">
                Support
              </Link>
            </>
          }
          stats={[
            { label: "Games In Ecosystem", value: hub.games.length, tone: "blue" },
            { label: "Organizations", value: hub.organizations.length, tone: "green" },
            { label: "Announcements", value: hub.news.length, tone: "yellow" },
            { label: "Events", value: hub.events.length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Community Channels</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Join, learn, compete, and stay informed</h2>
              </div>
              {[
                "Discord for live coordination and scene chatter",
                "Announcements for platform and event updates",
                "Support routes for teams, players, and partners",
                "Rules and FAQ as the ecosystem expands",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Join In" title="Community action lanes" description="The platform treats community as a real product surface, not just a footer link." />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { title: "Discord", detail: "Live scrim coordination, announcements, and community conversation.", href: "https://kamaucha.me/bravo", external: true },
                { title: "Rules", detail: "Unified event and community rules as the platform grows into multiple games.", href: "/events", external: false },
                { title: "Support", detail: "Contact routes for players, teams, organizers, and sponsors.", href: "/contact", external: false },
                { title: "FAQ", detail: "A future public FAQ lane for platform access, events, and rankings.", href: "/dashboard", external: false },
              ].map((item) =>
                item.external ? (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                  >
                    <p className="font-display text-sm font-black uppercase text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-text-muted">{item.detail}</p>
                  </a>
                ) : (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                  >
                    <p className="font-display text-sm font-black uppercase text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-text-muted">{item.detail}</p>
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Latest Announcements" title="What the ecosystem is hearing now" description="Editorial and operational updates stay visible from the community surface too." />
            <div className="mt-6 grid gap-3">
              {announcements.map((article) => (
                <Link key={article.slug} href={`/news/${article.slug}`} className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{article.category}</p>
                  <p className="mt-2 font-semibold text-white">{article.title}</p>
                  <p className="mt-2 text-sm text-text-muted">{article.summary}</p>
                </Link>
              ))}
              {announcements.length === 0 ? (
                <EmptyState title="No announcements yet" description="Platform announcements will appear here once the editorial lane is publishing." />
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
