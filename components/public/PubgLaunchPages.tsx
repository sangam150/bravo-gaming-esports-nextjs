import { EmptyState, formatDateRange, formatNumber } from "@/components/pubg/PubgHubUI";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PlatformEvent, PlatformHubData, PlatformSponsorProfile } from "@/lib/platform-hub";
import { canRegisterForPublicEvent } from "@/lib/public-event-policy";
import { getCanonicalPublicEventHref } from "@/lib/public-links";
import { resolveSponsorDestination, sponsorOpensInNewTab } from "@/lib/sponsor-links";
import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";

type LaunchSurfaceProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatRelativeWindow(startDate?: string | null) {
  if (!startDate) {
    return "Schedule to be announced";
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return "Schedule to be announced";
  }

  const now = new Date();
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayDiff = Math.round((startUtc - todayUtc) / 86400000);

  if (dayDiff < 0) {
    return "Recently completed";
  }

  if (dayDiff === 0) {
    return "Starts today";
  }

  if (dayDiff === 1) {
    return "Starts in 1 day";
  }

  return `Starts in ${dayDiff} days`;
}

function eventStatusLabel(status: PlatformEvent["status"]) {
  if (status === "live") {
    return "Ongoing";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "planned") {
    return "Planned";
  }

  return "Upcoming";
}

function canRegisterForEvent(event: PlatformEvent) {
  return canRegisterForPublicEvent(event);
}

function findSpotlightEvent(events: PlatformEvent[]) {
  const publicEvents = events.filter((event) => event.state === "published");
  return (
    publicEvents.find((event) => canRegisterForEvent(event)) ??
    publicEvents.find((event) => event.status !== "completed") ??
    publicEvents[0] ??
    null
  );
}

function registrationHref(event: PlatformEvent) {
  return `/teams/register?tournament=${event.id}`;
}

function eventSummaryText(event: PlatformEvent) {
  if (event.summary?.trim()) {
    return event.summary.trim();
  }

  return "Event details pending publication.";
}

function sponsorWordmark(name: string) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part, index) => (index === 0 ? part.toUpperCase() : part))
    .join(" ");
}

function SponsorWordmark({
  sponsor,
  compact = false,
}: {
  sponsor: PlatformSponsorProfile;
  compact?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        "flex items-center justify-center rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,16,30,0.95),rgba(6,10,20,0.98))] px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        compact ? "min-h-[84px] py-4" : "min-h-[260px] py-8"
      )}
    >
      <div>
        <p className={joinClasses("font-display font-black uppercase tracking-[0.12em] text-white", compact ? "text-xl" : "text-4xl")}>
          {sponsorWordmark(sponsor.name)}
        </p>
        <p className={joinClasses("mt-2 uppercase tracking-[0.18em] text-text-muted", compact ? "text-[10px]" : "text-xs")}>
          Official partner
        </p>
      </div>
    </div>
  );
}

function PublicBreadcrumbs({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-2">
          <span className={index === items.length - 1 ? "text-white" : ""}>{item}</span>
          {index < items.length - 1 ? <span className="text-white/30">/</span> : null}
        </span>
      ))}
    </div>
  );
}

function ActionTile({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  const className =
    "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.98))] p-4 transition hover:border-accent-blue/30 hover:bg-accent-blue/5";

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-black uppercase tracking-[0.08em] text-white">{title}</p>
        <ArrowRight className="h-4 w-4 text-accent-blue-light" />
      </div>
      <p className="mt-3 text-sm leading-7 text-text-muted">{description}</p>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function LaunchSurface({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: LaunchSurfaceProps) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_14%_18%,rgba(30,123,255,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,126,245,0.12),transparent_24%),linear-gradient(180deg,rgba(8,14,28,0.98),rgba(5,8,16,0.99))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[0.86fr,1.14fr]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-accent-blue-light">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[3rem] font-black uppercase leading-[0.9] text-white sm:text-[3.8rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-text-secondary sm:text-base">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryAction}
            {secondaryAction}
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function PubgLaunchSections({
  title,
  description,
  featureTitle,
  featureDescription,
  spotlightEvent,
  quickLinks,
}: {
  title: string;
  description: string;
  featureTitle: string;
  featureDescription: string;
  spotlightEvent: PlatformEvent | null;
  quickLinks: Array<{ href: string; title: string; description: string; external?: boolean }>;
}) {
  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.14fr,0.86fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(7,11,21,0.98))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Competition Data</p>
          <h2 className="mt-4 font-display text-3xl font-black uppercase text-white">{title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-text-secondary">{description}</p>
          <div className="mt-6">
            <EmptyState
              title={featureTitle}
              description={featureDescription}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {spotlightEvent && canRegisterForEvent(spotlightEvent) ? (
                    <Link href={registrationHref(spotlightEvent)} className="btn-primary">
                      Register Team
                    </Link>
                  ) : null}
                  <Link
                    href="/events"
                    className={spotlightEvent && canRegisterForEvent(spotlightEvent) ? "btn-secondary" : "btn-primary"}
                  >
                    View Events
                  </Link>
                </div>
              }
            />
          </div>
        </div>
        <div className="grid gap-4">
          {spotlightEvent ? (
            <div className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Next Public Event</p>
              <h3 className="mt-3 font-display text-2xl font-black uppercase text-white">{spotlightEvent.name}</h3>
              <p className="mt-3 text-sm leading-7 text-text-muted">{eventSummaryText(spotlightEvent)}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Date</p>
                  <p className="mt-2 text-sm text-white">{formatDateRange(spotlightEvent.startDate, spotlightEvent.endDate)}</p>
                </div>
                <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Window</p>
                  <p className="mt-2 text-sm text-white">{formatRelativeWindow(spotlightEvent.startDate)}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={getCanonicalPublicEventHref(spotlightEvent)} className="btn-secondary flex-1 justify-center">
                  View Event
                </Link>
                {canRegisterForEvent(spotlightEvent) ? (
                  <Link href={registrationHref(spotlightEvent)} className="btn-primary flex-1 justify-center">
                    Register
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
          {quickLinks.map((item) => (
            <ActionTile
              key={item.title}
              href={item.href}
              title={item.title}
              description={item.description}
              external={item.external}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,34,0.98),rgba(6,10,18,0.99))]">
        <div className="relative px-6 py-6 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(30,123,255,0.18),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(20,126,245,0.1),transparent_24%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-3xl items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-accent-blue/20 bg-accent-blue/10 text-accent-blue-light">
                <Users className="h-7 w-7" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Community</p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">
                  Be part of Nepal&apos;s PUBG PC esports community
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  Join Discord, follow official event announcements, and keep the next Bravo competition board within reach.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord min-w-[11rem] justify-center">
                Join Discord
              </a>
              {spotlightEvent && canRegisterForEvent(spotlightEvent) ? (
                <Link href={registrationHref(spotlightEvent)} className="btn-primary min-w-[11rem] justify-center">
                  Register Team
                </Link>
              ) : (
                <Link href="/events" className="btn-primary min-w-[11rem] justify-center">
                  View Events
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function PubgHubLaunchPage({
  hub,
  partners,
}: {
  hub: PlatformHubData;
  partners: PlatformSponsorProfile[];
}) {
  const spotlightEvent = findSpotlightEvent(hub.events);
  const registrationOpen = Boolean(spotlightEvent && canRegisterForEvent(spotlightEvent));

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="Bravo Gaming Esports"
          title="PUBG"
          description="Bravo's public PUBG hub is live for event access, policy links, and sponsor visibility. Official standings, teams, players, and match results will appear here once published data goes live."
          primaryAction={
            registrationOpen && spotlightEvent ? (
              <Link href={registrationHref(spotlightEvent)} className="btn-primary">
                Register Team
              </Link>
            ) : (
              <Link href="/events" className="btn-primary">
                View Events
              </Link>
            )
          }
          secondaryAction={
            <Link href="/rules" className="btn-secondary">
              View Rules
            </Link>
          }
        >
          {spotlightEvent ? (
            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
              <PublicBreadcrumbs items={["Home", "PUBG"]} />
              <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Next Featured Event</p>
                <h2 className="mt-4 font-display text-3xl font-black uppercase leading-tight text-white">{spotlightEvent.name}</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Date</p>
                    <p className="mt-2 text-sm text-white">{formatDateRange(spotlightEvent.startDate, spotlightEvent.endDate)}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Status</p>
                    <p className="mt-2 text-sm text-white">{eventStatusLabel(spotlightEvent.status)}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Format</p>
                    <p className="mt-2 text-sm text-white">{spotlightEvent.type}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Teams</p>
                    <p className="mt-2 text-sm text-white">
                      {spotlightEvent.teamsCount > 0 ? `${formatNumber(spotlightEvent.teamsCount)} Teams` : "Not tracked"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={getCanonicalPublicEventHref(spotlightEvent)} className="btn-secondary flex-1 justify-center">
                    View Details
                  </Link>
                  {canRegisterForEvent(spotlightEvent) ? (
                    <Link href={registrationHref(spotlightEvent)} className="btn-primary flex-1 justify-center">
                      Register
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-6">
              <EmptyState
                title="Next public PUBG event will appear here"
                description="The registration board, rules, and event details will be linked here as soon as the next Bravo PUBG event is published."
              />
            </div>
          )}
        </LaunchSurface>

        {partners.length > 0 ? (
          <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] p-5">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Official Partners</p>
            </div>
            <div className={joinClasses("mt-5 grid gap-4", partners.length === 1 ? "xl:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3")}>
              {partners.map((partner) => {
                const destination = resolveSponsorDestination(partner);
                const openInNewTab = sponsorOpensInNewTab(partner);
                const wordmark = <SponsorWordmark sponsor={partner} compact />;
                return destination ? (
                  <a
                    key={partner.id}
                    href={destination}
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                    aria-label={`Visit ${partner.name} website${openInNewTab ? " (opens in a new tab)" : ""}`}
                    className="transition hover:opacity-90"
                  >
                    {wordmark}
                  </a>
                ) : (
                  <div key={partner.id}>{wordmark}</div>
                );
              })}
            </div>
          </section>
        ) : null}

        <PubgLaunchSections
          title="Published PUBG results are pending"
          description="Event information and registration links remain available while Bravo prepares the next verified results set."
          featureTitle="No PUBG results are published"
          featureDescription="Standings, teams, players, and match statistics will appear after verified results are published."
          spotlightEvent={spotlightEvent}
          quickLinks={[
            { href: "/rules", title: "Rules", description: "Review the public competition rules before the next registration window closes." },
            { href: "/anti-cheat", title: "Anti-Cheat", description: "Read the integrity policy and evidence expectations for official Bravo competition." },
            { href: BRAVO_DISCORD_URL, title: "Join Discord", description: "Room calls, queue guidance, and fast support all route through the official Discord server.", external: true },
          ]}
        />
      </div>
    </main>
  );
}
