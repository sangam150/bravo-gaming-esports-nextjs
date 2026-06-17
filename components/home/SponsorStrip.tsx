"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRealtimeSponsors } from "@/lib/realtime-hooks";
import type { SponsorItem } from "@/lib/types";

const tierPriority = ["Title Sponsor", "Platinum Sponsor", "Gold Sponsor", "Silver Sponsor", "Community Partner"];

function sortSponsors(firstSponsor: SponsorItem, secondSponsor: SponsorItem) {
  const firstTierIndex = tierPriority.indexOf(firstSponsor.tier);
  const secondTierIndex = tierPriority.indexOf(secondSponsor.tier);

  return (
    (firstTierIndex === -1 ? Number.POSITIVE_INFINITY : firstTierIndex) -
      (secondTierIndex === -1 ? Number.POSITIVE_INFINITY : secondTierIndex) ||
    firstSponsor.tier.localeCompare(secondSponsor.tier) ||
    firstSponsor.name.localeCompare(secondSponsor.name)
  );
}

export default function SponsorStrip({ initialSponsors = [] }: { initialSponsors?: SponsorItem[] }) {
  const { data: liveSponsors } = useRealtimeSponsors(initialSponsors);

  const activeSponsors = useMemo(() => {
    const sourceSponsors = liveSponsors.length > 0 ? liveSponsors : initialSponsors;
    return [...sourceSponsors].filter((sponsor) => sponsor.published !== false).sort(sortSponsors);
  }, [initialSponsors, liveSponsors]);

  const sponsorsByTier = useMemo(() => {
    return activeSponsors.reduce<Map<string, SponsorItem[]>>((groups, sponsor) => {
      const currentTierSponsors = groups.get(sponsor.tier) ?? [];
      currentTierSponsors.push(sponsor);
      groups.set(sponsor.tier, currentTierSponsors);
      return groups;
    }, new Map<string, SponsorItem[]>());
  }, [activeSponsors]);

  return (
    <section className="sponsor-strip mt-8 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title">Sponsors & Partners</p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Homepage Sponsor Placements</h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            This section updates in realtime and only shows published sponsor records.
          </p>
        </div>
        <Link href="/about/sponsor-us" className="btn-secondary shrink-0 !py-2 !text-[11px]">
          Sponsor Us
        </Link>
      </div>

      {activeSponsors.length === 0 ? (
        <div className="mt-5 rounded-card border border-dashed border-white/10 bg-bg-primary px-5 py-8 text-center">
          <p className="font-display text-sm font-bold uppercase text-white">Sponsor content not published yet</p>
          <p className="mt-2 text-sm text-text-muted">
            Publish sponsor entries from admin to show them on the homepage automatically.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {Array.from(sponsorsByTier.entries()).map(([tier, sponsors]) => (
            <div key={tier}>
              <p className="text-center font-display text-label font-bold uppercase tracking-[0.12em] text-text-muted">
                {tier}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {sponsors.map((sponsor) =>
                  sponsor.url ? (
                    <a
                      key={sponsor.id}
                      href={sponsor.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-card border border-white/[0.08] bg-bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:border-accent-blue/40 hover:text-accent-blue"
                    >
                      {sponsor.name}
                    </a>
                  ) : (
                    <span
                      key={sponsor.id}
                      className="rounded-card border border-white/[0.08] bg-bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white"
                    >
                      {sponsor.name}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
