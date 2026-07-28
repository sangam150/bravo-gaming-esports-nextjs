import {
  PublicActionLink,
  PublicEmptyState,
  PublicMetric,
  PublicPageHero,
  PublicPartnerStrip,
  PublicSectionHeader,
  PublicStatusBadge,
  formatPublicNumber,
  joinClasses,
} from "@/components/public/PublicDesignSystem";
import ManagedImage from "@/components/ui/ManagedImage";
import type { PlatformHubData, PlatformSponsorProfile } from "@/lib/platform-hub";
import { resolveSponsorDestination } from "@/lib/sponsor-links";
import { Gamepad2, MessageCircle, ShieldCheck, Trophy, Users } from "lucide-react";
import { isCompatibilityFallback } from "./ContentPageShared";

function sponsorVisual(sponsor: PlatformSponsorProfile) {
  return sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl ?? null;
}

function SponsorAsset({
  sponsor,
  className,
  priority = false,
}: {
  sponsor: PlatformSponsorProfile;
  className: string;
  priority?: boolean;
}) {
  const visual = sponsorVisual(sponsor);
  if (visual) {
    return (
      <ManagedImage
        src={visual}
        alt={`${sponsor.name} partner artwork`}
        priority={priority}
        sizes="(min-width: 1280px) 52vw, 100vw"
        wrapperClassName={className}
        className="object-contain p-6"
      />
    );
  }
  return (
    <div
      className={joinClasses(
        className,
        "flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(8,102,255,0.18),transparent_42%),linear-gradient(145deg,#071522,#020812)] p-6 text-center",
      )}
    >
      <span className="font-display text-3xl font-bold uppercase text-white">{sponsor.name}</span>
    </div>
  );
}

function FeaturedSponsor({ sponsor }: { sponsor: PlatformSponsorProfile }) {
  const destination = resolveSponsorDestination(sponsor);

  return (
    <section className="public-panel overflow-hidden">
      <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
        <div className="p-5 sm:p-6">
          <p className="public-kicker">Featured Partner</p>
          {sponsor.logoUrl ? (
            <ManagedImage
              src={sponsor.logoUrl}
              alt={sponsor.name}
              sizes="300px"
              wrapperClassName="mt-5 h-20 w-full max-w-xs"
              className="object-contain object-left"
            />
          ) : (
            <h2 className="mt-4 font-display text-3xl font-bold uppercase text-white">{sponsor.name}</h2>
          )}
          <p className="mt-5 text-sm leading-7 text-text-secondary">{sponsor.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PublicActionLink href={`/sponsors/${sponsor.slug}`} variant="secondary">
              View Partner Profile
            </PublicActionLink>
            {destination ? (
              <PublicActionLink
                href={destination}
                openInNewTab={sponsor.openInNewTab}
                externalLabel={sponsor.openInNewTab ? " opens in a new tab" : undefined}
              >
                Visit Partner
              </PublicActionLink>
            ) : null}
          </div>
        </div>
        <SponsorAsset
          sponsor={sponsor}
          priority
          className="min-h-56 w-full border-t border-white/10 lg:border-l lg:border-t-0"
        />
      </div>
    </section>
  );
}

function PartnershipTier({
  title,
  tone,
  description,
  opportunities,
}: {
  title: string;
  tone: "blue" | "amber" | "neutral" | "green";
  description: string;
  opportunities: string[];
}) {
  return (
    <article
      className={joinClasses(
        "public-card flex flex-col p-5",
        tone === "amber" && "border-accent-yellow/30 bg-accent-yellow/[0.04]",
        tone === "blue" && "border-accent-blue/35",
        tone === "green" && "border-accent-green/25",
      )}
    >
      <PublicStatusBadge tone={tone}>{title}</PublicStatusBadge>
      <p className="mt-4 text-sm leading-6 text-text-secondary">{description}</p>
      <ul className="mt-5 space-y-3 text-sm text-white">
        {opportunities.map((opportunity) => (
          <li key={opportunity} className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue-light" aria-hidden="true" />
            <span>{opportunity}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs leading-5 text-text-muted">
        Final scope and deliverables are confirmed per campaign.
      </p>
      <div className="mt-auto pt-5">
        <PublicActionLink href="/contact" variant="secondary" className="w-full justify-center">
          Discuss {title}
        </PublicActionLink>
      </div>
    </article>
  );
}

export function SponsorsReferencePage({ hub }: { hub: PlatformHubData }) {
  const sponsors = hub.sponsors.filter(
    (sponsor) => sponsor.visible && sponsor.showOnSponsorsPage && !isCompatibilityFallback(sponsor.id),
  );
  const featuredSponsor = sponsors.find((sponsor) => sponsor.featured) ?? sponsors[0] ?? null;
  const publishedEvents = hub.events.filter(
    (event) => event.state === "published" && !isCompatibilityFallback(event.id),
  );
  const pubgGame = hub.games.find((game) => game.slug === "pubg-pc") ?? null;
  const verifiedTeams = pubgGame && pubgGame.trackedTeams > 0 ? pubgGame.trackedTeams : null;
  const verifiedPlayers = pubgGame && pubgGame.trackedPlayers > 0 ? pubgGame.trackedPlayers : null;
  const verifiedMatches = pubgGame && pubgGame.trackedMatches > 0 ? pubgGame.trackedMatches : null;

  return (
    <main className="public-page">
      <PublicPageHero
        breadcrumbCurrent="Sponsors"
        eyebrow="Bravo Gaming Esports"
        title="Sponsors"
        description="Partner with Bravo Gaming Esports through transparent event, broadcast, and community opportunities built around published competition coverage."
        imageUrl={featuredSponsor?.bannerUrl}
        actions={
          <>
            <PublicActionLink href="/sponsor-kit">View Sponsor Kit</PublicActionLink>
            <PublicActionLink href="/contact" variant="secondary">
              Contact Bravo
            </PublicActionLink>
          </>
        }
      />

      <div className="public-container space-y-7 py-6">
        {sponsors.length > 1 ? <PublicPartnerStrip sponsors={sponsors} /> : null}

        {featuredSponsor ? (
          <FeaturedSponsor sponsor={featuredSponsor} />
        ) : (
          <PublicEmptyState
            title="No sponsor profiles are published"
            description="Official partner logos, descriptions, and profile links will appear here after approval. Partnership information remains available through the sponsor kit."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <PublicActionLink href="/sponsor-kit">View Sponsor Kit</PublicActionLink>
                <PublicActionLink href="/contact" variant="secondary">
                  Contact Bravo
                </PublicActionLink>
              </div>
            }
          />
        )}

        <section className="space-y-4">
          <PublicSectionHeader eyebrow="Partnership Opportunities" title="Explore Ways to Partner" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PartnershipTier
              title="Titanium Partner"
              tone="blue"
              description="A potential flagship collaboration for campaigns requiring broad event and broadcast visibility."
              opportunities={[
                "Possible flagship event placement",
                "Potential broadcast integrations",
                "Campaign-specific creative planning",
              ]}
            />
            <PartnershipTier
              title="Gold Partner"
              tone="amber"
              description="A potential campaign package spanning selected event, media, and community touchpoints."
              opportunities={[
                "Possible selected-event visibility",
                "Potential digital content placement",
                "Campaign activation planning",
              ]}
            />
            <PartnershipTier
              title="Silver Partner"
              tone="neutral"
              description="A focused option for brands exploring targeted competition and community placements."
              opportunities={["Possible digital placements", "Selected social mentions", "Event-support discussions"]}
            />
            <PartnershipTier
              title="Community Partner"
              tone="green"
              description="A grassroots collaboration path for organizations supporting Nepal’s competitive community."
              opportunities={[
                "Potential community recognition",
                "Selected public-page placement",
                "Grassroots campaign planning",
              ]}
            />
          </div>
        </section>

        <section className="space-y-4">
          <PublicSectionHeader eyebrow="Verified Platform Context" title="Why Partner With Bravo" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {verifiedPlayers ? (
              <PublicMetric
                label="Tracked players"
                value={formatPublicNumber(verifiedPlayers)}
                icon={<Users className="h-5 w-5" />}
              />
            ) : null}
            {verifiedTeams ? (
              <PublicMetric
                label="Tracked teams"
                value={formatPublicNumber(verifiedTeams)}
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            ) : null}
            <PublicMetric
              label="Published events"
              value={formatPublicNumber(publishedEvents.length)}
              icon={<Trophy className="h-5 w-5" />}
            />
            {verifiedMatches ? (
              <PublicMetric
                label="Tracked matches"
                value={formatPublicNumber(verifiedMatches)}
                icon={<Gamepad2 className="h-5 w-5" />}
              />
            ) : null}
          </div>
        </section>

        <section className="public-cta">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light sm:inline-flex">
                <MessageCircle className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="public-kicker">Partnership Enquiries</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase text-white">
                  Let’s build the future of esports together
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                  Share your campaign goals with the Bravo team and review the current public sponsor overview.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <PublicActionLink href="/contact">Become a Sponsor</PublicActionLink>
              <PublicActionLink href="/sponsor-kit" variant="secondary">
                View Sponsor Kit
              </PublicActionLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
