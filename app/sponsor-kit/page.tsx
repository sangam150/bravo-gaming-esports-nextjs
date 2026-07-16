import Link from "next/link";
import type { Metadata } from "next";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { getSiteStats } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = buildContentMetadata({
  title: "Sponsor Kit | Bravo Gaming Esports",
  description:
    "Review Bravo Gaming Esports sponsor packages, public event proof, tournament formats, and partnership contact options.",
  path: "/sponsor-kit",
  type: "website",
});

function formatNumberValue(value: number) {
  return value.toLocaleString("en-US");
}

function hasMeaningfulText(value?: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && !normalized.includes("soon") && !normalized.includes("request");
}

function formatDateRangeLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "Date to be announced";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  });

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return startDate;
  }

  if (!endDate) {
    return formatter.format(start);
  }

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export default async function SponsorKitPage() {
  const [hub, stats] = await Promise.all([getPlatformHubData(), getSiteStats()]);

  const publicEvents = hub.events.filter((event) => event.state === "published");
  const proofEvents =
    publicEvents.filter((event) => event.status === "completed").slice(0, 3).length > 0
      ? publicEvents.filter((event) => event.status === "completed").slice(0, 3)
      : publicEvents.slice(0, 3);
  const eventFormats = Array.from(new Set(publicEvents.map((event) => event.type).filter(Boolean))).slice(0, 5);

  const sponsorPackages = [
    {
      title: "Community Partner",
      detail: "Best for always-on community support around scrims, Discord promotion, and recurring visibility.",
      deliverables: [
        "Logo placement on sponsor and community touchpoints",
        "Discord announcement support on relevant events",
        "Social post inclusion for qualifying event moments",
      ],
    },
    {
      title: "Stream Partner",
      detail: "Focused on live broadcast branding and stream-facing brand visibility.",
      deliverables: [
        "Logo placement on live stream overlays and thumbnails",
        "On-stream brand mention during featured coverage",
        "Broadcast graphic placement where the event package supports it",
      ],
    },
    {
      title: "Tournament Partner",
      detail: "Built for event-level collaboration with public pages, rules links, and admin-backed operations.",
      deliverables: [
        "Logo placement on event pages and event graphics",
        "Discord and public event promotion support",
        "Partner visibility inside official tournament communications",
      ],
    },
    {
      title: "Title Partner",
      detail: "For flagship campaigns that need top-line branding, naming visibility, and deeper media coordination.",
      deliverables: [
        "Primary naming placement where the event format supports it",
        "Priority logo treatment across launch materials",
        "Expanded stream, social, and event graphic visibility",
      ],
    },
  ] as const;

  const trustPolicies = [
    {
      title: "Registration Review",
      timeline: "Target: within 24 hours",
      detail: "Team submissions enter a review queue before slots are confirmed through official Bravo channels.",
    },
    {
      title: "Dispute Response",
      timeline: "Initial response target: within 12 hours",
      detail: "Teams should expect a first admin response after evidence is received, with follow-up updates as review progresses.",
    },
    {
      title: "Anti-Cheat Review",
      timeline: "Case update target: within 48 hours after required files are received",
      detail: "Integrity checks may request POV files, screenshots, or account verification before a case is finalized.",
    },
    {
      title: "Prize / Payment",
      timeline: "Target: within 7 business days after final result verification",
      detail: "Event-specific exceptions should be published in the event details or communicated through official admin channels.",
    },
    {
      title: "Sponsor Inquiry",
      timeline: "Response target: within 2 business days",
      detail: "Bravo uses the contact route below for partner follow-up, package discussion, and next-step coordination.",
    },
    {
      title: "Support Routing",
      timeline: "Public support route always available",
      detail: "Community, team, sponsor, and tournament requests can escalate through the public contact page and official Discord.",
    },
  ] as const;

  const proofCards = proofEvents.map((event) => {
    const relatedSponsors = hub.sponsors
      .filter(
        (sponsor) =>
          sponsor.eventSlugs.includes(event.slug) ||
          sponsor.supportedEvents.includes(event.name) ||
          (event.sponsorName ? sponsor.name === event.sponsorName : false)
      )
      .map((sponsor) => sponsor.name);

    return {
      name: event.name,
      date: formatDateRangeLabel(event.startDate, event.endDate),
      teams: event.teamsCount > 0 ? formatNumberValue(event.teamsCount) : "Available on request",
      matches: event.matchesCount > 0 ? formatNumberValue(event.matchesCount) : "Available on request",
      winner: event.topTeamName ?? "Published in official standings",
      sponsors: relatedSponsors.length > 0 ? relatedSponsors.join(", ") : "No public sponsor profile linked yet",
    };
  });

  const audienceCards = [
    {
      label: "Community Reach",
      value: stats.communityMembers > 0 ? formatNumberValue(stats.communityMembers) : "Available upon request",
      detail: "Public community scale pulled from Bravo site stats when available.",
    },
    {
      label: "Teams Registered",
      value: stats.teamsRegistered > 0 ? formatNumberValue(stats.teamsRegistered) : "Available upon request",
      detail: "Registered team count shown only when the site stats record has live numbers.",
    },
    {
      label: "Matches Hosted",
      value: stats.matchesHosted > 0 ? formatNumberValue(stats.matchesHosted) : "Available upon request",
      detail: "Live operational total across published Bravo competition coverage.",
    },
    {
      label: "YouTube / Stream Reach",
      value: hasMeaningfulText(stats.youtubeViews) ? stats.youtubeViews : "Available upon request",
      detail: "Broadcast and content reach can be supplied directly when a campaign needs exact figures.",
    },
  ] as const;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
            <div>
              <p className="section-title">Sponsor Kit</p>
              <h1 className="mt-4 font-display text-4xl font-black uppercase text-white sm:text-5xl">
                Sponsor-ready
                <br />
                Bravo overview
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
                Use this page for a clean public read on Bravo Gaming Esports partnership options, real event proof, and
                tournament support standards. Where exact audience numbers are not yet published, we state that clearly
                instead of filling the gap with estimates.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact" className="btn-primary">
                  Contact Bravo
                </Link>
                <Link href="/tournament-partners" className="btn-secondary">
                  Tournament Partners
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <p className="section-title">Current Public Formats</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {eventFormats.length > 0 ? (
                  eventFormats.map((format) => (
                    <span
                      key={format}
                      className="inline-flex rounded-full border border-white/10 bg-bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
                    >
                      {format}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex rounded-full border border-white/10 bg-bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                    Audience stats available upon request
                  </span>
                )}
              </div>
              <p className="mt-5 text-sm leading-7 text-text-muted">
                Average live stream viewers and combined social reach are not hard-coded here when the public stat set
                is incomplete. Audience stats available upon request.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {audienceCards.map((card) => (
            <div key={card.label} className="esports-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{card.label}</p>
              <p className="mt-3 font-mono-stat text-3xl text-white">{card.value}</p>
              <p className="mt-3 text-sm leading-6 text-text-muted">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <p className="section-title">Sponsor Packages</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">Partnership tiers and deliverables</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {sponsorPackages.map((tier) => (
              <div key={tier.title} className="esports-card p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue-light">{tier.title}</p>
                <p className="mt-3 text-sm leading-7 text-text-muted">{tier.detail}</p>
                <div className="mt-5 grid gap-3">
                  {tier.deliverables.map((deliverable) => (
                    <div key={deliverable} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                      {deliverable}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="section-title">Proof Blocks</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">Published event proof, not placeholder claims</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {proofCards.length > 0 ? (
              proofCards.map((card) => (
                <div key={card.name} className="esports-card p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{card.date}</p>
                  <h3 className="mt-3 font-display text-2xl font-black uppercase text-white">{card.name}</h3>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Teams Participated</p>
                      <p className="mt-2 text-white">{card.teams}</p>
                    </div>
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Matches Hosted</p>
                      <p className="mt-2 text-white">{card.matches}</p>
                    </div>
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner</p>
                      <p className="mt-2 text-white">{card.winner}</p>
                    </div>
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Public Sponsor Context</p>
                      <p className="mt-2 text-white">{card.sponsors}</p>
                    </div>
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Viewership / Social Reach</p>
                      <p className="mt-2 text-white">Audience stats available upon request.</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="xl:col-span-3">
                <div className="esports-card p-6 text-sm text-text-muted">
                  Public event proof blocks will expand here as more completed events and sponsor profiles are published.
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="section-title">Trust Policies</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">Timelines, support flow, and review expectations</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {trustPolicies.map((policy) => (
              <div key={policy.title} className="esports-card p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue-light">{policy.timeline}</p>
                <h3 className="mt-3 font-display text-xl font-black uppercase text-white">{policy.title}</h3>
                <p className="mt-4 text-sm leading-7 text-text-muted">{policy.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
