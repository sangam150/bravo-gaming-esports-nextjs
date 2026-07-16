import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildContentMetadata({
  title: "Tournament Partners | Bravo Gaming Esports",
  description:
    "Review Bravo Gaming Esports tournament operations, anti-cheat workflow, dispute handling, support timelines, and broadcast coordination.",
  path: "/tournament-partners",
  type: "website",
});

const operationsBlocks = [
  {
    title: "Rules Governance",
    detail:
      "Public rules, event-specific instructions, and final admin notices should align before a tournament is shared widely. Bravo uses the event page and official Discord as the public source of truth.",
  },
  {
    title: "Anti-Cheat Workflow",
    detail:
      "Integrity review can include POV requests, screenshots, roster verification, and account checks. Evidence is reviewed through a documented admin flow instead of ad-hoc decisions.",
  },
  {
    title: "Dispute Process",
    detail:
      "Teams are expected to submit clear evidence inside the event dispute window. Bravo acknowledges the issue, logs the review, and follows up with the ruling through official channels.",
  },
  {
    title: "Broadcast Support",
    detail:
      "Tournament pages, stream links, public standings, and sponsor visibility stay aligned so live coverage and partner branding point to the same official event context.",
  },
  {
    title: "Admin Review Workflow",
    detail:
      "Registration review, match approval, result publication, and roster concerns all move through admin review checkpoints before they become public-facing updates.",
  },
  {
    title: "Operations Process",
    detail:
      "Bravo keeps registration, rules, anti-cheat, contact, standings, and sponsor context linked together so teams and partners do not need to hunt across separate channels.",
  },
] as const;

const responseTimeline = [
  {
    title: "Registration Review",
    value: "Target within 24 hours",
  },
  {
    title: "Dispute Acknowledgement",
    value: "Target within 12 hours after evidence arrives",
  },
  {
    title: "Anti-Cheat Case Update",
    value: "Target within 48 hours once required files are received",
  },
  {
    title: "Sponsor / Partner Reply",
    value: "Target within 2 business days",
  },
  {
    title: "Prize / Payment Processing",
    value: "Target within 7 business days after final result verification",
  },
  {
    title: "Community Support",
    value: "Public contact and Discord route always available",
  },
] as const;

const processSteps = [
  "Registration is submitted and checked against the public event state before it enters review.",
  "Admins confirm roster, branding, and event eligibility before approval is issued.",
  "Results publish only after review or approved import workflows complete.",
  "Disputes and integrity concerns move through a documented evidence-first process.",
  "Sponsors and tournament partners can align branding, stream support, and public pages around one event hub.",
] as const;

export default function TournamentPartnersPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
            <div>
              <p className="section-title">Tournament Partners</p>
              <h1 className="mt-4 font-display text-4xl font-black uppercase text-white sm:text-5xl">
                Organizer trust
                <br />
                and event operations
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                This page is built for sponsors, organizers, and operational partners who need more than a highlight reel.
                It outlines how Bravo handles rules governance, review gates, disputes, anti-cheat, and public event support.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact" className="btn-primary">
                  Contact Bravo
                </Link>
                <Link href="/sponsor-kit" className="btn-secondary">
                  View Sponsor Kit
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Official Discord
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <p className="section-title">Process Snapshot</p>
              <div className="mt-5 grid gap-3">
                {processSteps.map((step, index) => (
                  <div key={step} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                    {index + 1}. {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="section-title">Operations Blocks</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">What partners can expect from Bravo</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {operationsBlocks.map((block) => (
              <div key={block.title} className="esports-card p-6">
                <h3 className="font-display text-xl font-black uppercase text-white">{block.title}</h3>
                <p className="mt-4 text-sm leading-7 text-text-muted">{block.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="section-title">Response SLA</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">Public support and review timelines</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {responseTimeline.map((item) => (
              <div key={item.title} className="esports-card p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{item.title}</p>
                <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="esports-card p-6">
          <p className="section-title">Partner Notes</p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Need exact audience or campaign numbers?</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-text-muted">
            The operational trust layer lives here; the commercial package and public proof layer lives in the sponsor
            kit. If your team needs exact audience stats, reach, or campaign planning inputs, Bravo can provide them
            directly instead of publishing incomplete figures.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sponsor-kit" className="btn-primary">
              Open Sponsor Kit
            </Link>
            <Link href="/rules" className="btn-secondary">
              Review Rules
            </Link>
            <Link href="/anti-cheat" className="btn-secondary">
              Anti-Cheat Policy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
