import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

const ruleSections = [
  {
    title: "Registration & Eligibility",
    detail:
      "Every team must register with accurate roster details before joining official Bravo scrims or tournaments. Event-specific eligibility rules, roster locks, and schedule requirements published on the event page or in Discord remain binding.",
  },
  {
    title: "Lobby Conduct",
    detail:
      "Players and staff are expected to maintain respectful communication, follow lobby instructions, and avoid disruptive behavior during registration, room calls, live matches, and result review windows.",
  },
  {
    title: "Competitive Format",
    detail:
      "Match counts, map rotation, scoring, and check-in rules may vary by event. When a tournament page includes a published format, that format overrides any older generic guidance.",
  },
  {
    title: "Results & Admin Decisions",
    detail:
      "Official standings, penalties, and match outcomes are finalized after Bravo admin review. Teams must cooperate with result verification, dispute windows, and evidence requests when they are issued.",
  },
] as const;

export const metadata: Metadata = buildContentMetadata({
  title: "Bravo Gaming Esports Rules",
  description: "Official Bravo Gaming Esports competition, conduct, and participation rules for PUBG PC scrims and tournaments.",
  path: "/rules",
  type: "website",
});

export default function RulesPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.12fr,0.88fr]">
            <div>
              <p className="section-title">Competition Rules</p>
              <h1 className="mt-4 font-display text-4xl font-black uppercase text-white sm:text-5xl">
                Official Bravo
                <br />
                Rules & Conduct
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                Review the core public rules for Bravo PUBG PC scrims and tournaments. Event-specific instructions,
                schedules, and roster limits published on official event pages or in Discord always take priority.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/events" className="btn-primary">
                  View Events
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
                <Link href="/contact" className="btn-secondary">
                  Contact Bravo
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <p className="section-title">Before You Queue</p>
              <div className="mt-5 grid gap-3">
                {[
                  "Register the correct team roster before match day.",
                  "Monitor official Discord notices for lobby times and changes.",
                  "Follow event-specific scoring, room rules, and check-in instructions.",
                  "Keep proof ready for disputes, result checks, or roster verification.",
                ].map((item) => (
                  <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {ruleSections.map((section) => (
            <div key={section.title} className="esports-card p-6">
              <h2 className="font-display text-xl font-black uppercase text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{section.detail}</p>
            </div>
          ))}
        </section>

        <section className="esports-card p-6">
          <p className="section-title">Final Note</p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Public rules support a fair competitive standard</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-text-muted">
            Bravo may update public rules when event formats, anti-cheat safeguards, or tournament operations require
            it. The latest published event page and official Discord notice should be treated as the active source of
            truth.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/anti-cheat" className="btn-secondary">
              Anti-Cheat Policy
            </Link>
            <Link href="/about/sponsor-us" className="btn-primary">
              Sponsor Inquiry
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
