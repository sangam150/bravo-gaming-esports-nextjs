import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

const policySections = [
  {
    title: "Fair Play Standard",
    detail:
      "Bravo competitions require honest play, accurate roster identity, and full compliance with tournament instructions. Any action that creates an unfair gameplay advantage may trigger review or removal.",
  },
  {
    title: "Prohibited Tools & Exploits",
    detail:
      "Cheats, unauthorized software, scripts, macro abuse, exploit usage, stream-sniping, account sharing, and any manipulation of event or match data are strictly prohibited on Bravo public competition routes.",
  },
  {
    title: "Evidence & Review",
    detail:
      "Bravo may request POV files, screenshots, account verification, or other supporting evidence during a review. Failure to cooperate with a reasonable investigation can be treated as a policy violation.",
  },
  {
    title: "Penalties & Enforcement",
    detail:
      "Violations may result in match penalties, result removal, event disqualification, suspensions, permanent bans, or wider platform restrictions depending on severity, evidence, and repeat behavior.",
  },
] as const;

const reviewTimeline = [
  {
    title: "Evidence Intake",
    detail: "Initial acknowledgement target: within 12 hours after the required files or links are submitted.",
  },
  {
    title: "Case Review",
    detail: "Case update target: within 48 hours once POV files, screenshots, and verification details are complete.",
  },
  {
    title: "Enforcement Follow-up",
    detail: "Result updates, match corrections, or wider restrictions are communicated through official Bravo channels after review.",
  },
] as const;

export const metadata: Metadata = buildContentMetadata({
  title: "Bravo Gaming Esports Anti-Cheat Policy",
  description: "Official Bravo Gaming Esports anti-cheat, integrity, investigation, and enforcement policy for PUBG PC scrims and tournaments.",
  path: "/anti-cheat",
  type: "website",
});

export default function AntiCheatPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.12fr,0.88fr]">
            <div>
              <p className="section-title">Competitive Integrity</p>
              <h1 className="mt-4 font-display text-4xl font-black uppercase text-white sm:text-5xl">
                Bravo Anti-Cheat
                <br />
                Policy
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                Bravo PUBG PC scrims and tournaments are built around fair play, evidence-backed review, and strong
                competitive integrity standards. Every player and team is expected to comply fully.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/rules" className="btn-primary">
                  Review Rules
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
                <Link href="/contact" className="btn-secondary">
                  Report an Issue
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <p className="section-title">Zero Tolerance Areas</p>
              <div className="mt-5 grid gap-3">
                {[
                  "Unauthorized software, macros, cheats, or exploit abuse.",
                  "Account sharing, false identity, or roster impersonation.",
                  "Tampering with match evidence, admin review, or published results.",
                  "Refusal to cooperate with a fair integrity investigation.",
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
          {policySections.map((section) => (
            <div key={section.title} className="esports-card p-6">
              <h2 className="font-display text-xl font-black uppercase text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{section.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {reviewTimeline.map((item) => (
            <div key={item.title} className="esports-card p-6">
              <p className="section-title">Review Timeline</p>
              <h2 className="mt-3 font-display text-xl font-black uppercase text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="esports-card p-6">
          <p className="section-title">Appeals & Updates</p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Integrity notices may be updated as events scale</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-text-muted">
            Event-specific integrity procedures, proof requirements, or appeal windows may be published alongside a
            tournament announcement. When that happens, the latest official event page and Bravo admin notice should be
            treated as the current policy reference.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/events" className="btn-secondary">
              Browse Events
            </Link>
            <Link href="/sponsor-kit" className="btn-primary">
              Sponsor Inquiry
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
