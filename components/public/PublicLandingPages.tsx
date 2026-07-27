import {
EmptyState,
buildHref,
formatDate,
formatDateRange,
formatNumber,
} from "@/components/pubg/PubgHubUI";
import ManagedImage from "@/components/ui/ManagedImage";
import {
BRAVO_DISCORD_URL,
BRAVO_INSTAGRAM_URL,
BRAVO_YOUTUBE_URL,
} from "@/lib/brand-links";
import type {
PlatformArticle,
PlatformEvent,
PlatformHubData,
PlatformMediaItem,
PlatformSponsorProfile,
} from "@/lib/platform-hub";
import {
ArrowRight,
MessageCircle,
Search,
Users,
} from "lucide-react";
import Link from "next/link";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

type LaunchSurfaceProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
};

function readSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

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

function eventStatusTone(status: PlatformEvent["status"]) {
  if (status === "live") {
    return "border-accent-green/30 bg-accent-green/10 text-accent-green";
  }

  if (status === "completed") {
    return "border-white/10 bg-white/5 text-text-muted";
  }

  if (status === "planned") {
    return "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow";
  }

  return "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light";
}

function eventStatusLabel(status: PlatformEvent["status"]) {
  if (status === "live") {
    return "Ongoing";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "planned") {
    return "Registration Opening Soon";
  }

  return "Upcoming";
}

function canRegisterForEvent(event: PlatformEvent) {
  return event.state === "published" && event.status === "upcoming";
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

  return "Official Bravo Gaming Esports event board with registration guidance, schedule status, and policy links.";
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

function HeroChannelRow() {
  const channels = [
    { href: BRAVO_YOUTUBE_URL, label: "YouTube", icon: <span className="text-[11px] font-black uppercase">YT</span> },
    { href: BRAVO_INSTAGRAM_URL, label: "Instagram", icon: <span className="text-[11px] font-black uppercase">IG</span> },
    { href: BRAVO_DISCORD_URL, label: "Discord", icon: <MessageCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {channels.map((channel) => (
        <a
          key={channel.label}
          href={channel.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/20 text-white transition hover:border-accent-blue/35 hover:bg-accent-blue/10"
          aria-label={channel.label}
          title={channel.label}
        >
          {channel.icon}
        </a>
      ))}
    </div>
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

function CategoryPills({
  pathname,
  items,
  activeValue,
  query,
  paramName = "category",
}: {
  pathname: string;
  items: Array<{ label: string; value: string }>;
  activeValue: string;
  query?: string;
  paramName?: string;
}) {
  return (
    <nav aria-label={`${paramName} filters`} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildHref(pathname, {
            q: query || undefined,
            [paramName]: item.value === "all" ? undefined : item.value,
          })}
          aria-current={activeValue === item.value ? "page" : undefined}
          className={joinClasses(
            "inline-flex items-center rounded-[14px] border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition",
            activeValue === item.value
              ? "border-blue-400/40 bg-blue-700 text-white shadow-[0_0_24px_rgba(30,123,255,0.24)]"
              : "border-white/10 bg-black/20 text-text-muted hover:border-accent-blue/30 hover:text-white"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function EventGridCard({
  event,
  accent = "blue",
}: {
  event: PlatformEvent;
  accent?: "blue" | "gold" | "green";
}) {
  const surfaceClass =
    accent === "gold"
      ? "border-accent-yellow/20 bg-[linear-gradient(180deg,rgba(33,24,10,0.96),rgba(14,11,7,0.98))]"
      : accent === "green"
        ? "border-accent-green/20 bg-[linear-gradient(180deg,rgba(12,27,19,0.96),rgba(6,14,10,0.98))]"
        : "border-accent-blue/20 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(7,11,21,0.98))]";

  return (
    <article className={joinClasses("overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]", surfaceClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">{event.type || "PUBG Event"}</p>
          <h3 className="mt-3 font-display text-2xl font-black uppercase leading-tight text-white">{event.name}</h3>
        </div>
        <span className={joinClasses("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", eventStatusTone(event.status))}>
          {eventStatusLabel(event.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Date</span>
          <span className="text-right text-white">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Format</span>
          <span className="text-right text-white">{event.type || "PUBG Format"}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Teams</span>
          <span className="text-right text-white">{event.teamsCount > 0 ? `${formatNumber(event.teamsCount)} Teams` : "Team slots soon"}</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-text-muted">{eventSummaryText(event)}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {canRegisterForEvent(event) ? (
          <Link href={registrationHref(event)} className="btn-primary flex-1 justify-center">
            Register Team
          </Link>
        ) : null}
        <Link
          href={`/events/${event.slug}`}
          className={joinClasses("flex-1 justify-center", canRegisterForEvent(event) ? "btn-secondary" : "btn-primary")}
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

function SpotlightEventCard({ event }: { event: PlatformEvent }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-accent-yellow/20 bg-[linear-gradient(180deg,rgba(26,19,9,0.96),rgba(10,10,10,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="grid gap-0 xl:grid-cols-[1.16fr,0.84fr]">
        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
              Featured Event
            </span>
            <span className={joinClasses("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", eventStatusTone(event.status))}>
              {eventStatusLabel(event.status)}
            </span>
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-accent-blue-light">
            Bravo Gaming Esports
          </p>
          <h2 className="mt-4 font-display text-4xl font-black uppercase leading-[0.92] text-white">
            {event.name}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-text-secondary">{eventSummaryText(event)}</p>
        </div>
        <div className="border-t border-white/[0.08] p-6 xl:border-l xl:border-t-0">
          <div className="grid gap-4">
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Date</p>
              <p className="mt-2 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
            </div>
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Format</p>
              <p className="mt-2 text-sm text-white">{event.type || "PUBG Format"}</p>
            </div>
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Teams</p>
              <p className="mt-2 text-sm text-white">{event.teamsCount > 0 ? `${formatNumber(event.teamsCount)} Teams` : "To be announced"}</p>
            </div>
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Window</p>
              <p className="mt-2 text-sm text-white">{formatRelativeWindow(event.startDate)}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {canRegisterForEvent(event) ? (
                <Link href={registrationHref(event)} className="btn-primary flex-1 justify-center">
                  Register Team
                </Link>
              ) : null}
              <Link href={`/events/${event.slug}`} className="btn-secondary flex-1 justify-center">
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsEmptyColumns() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.18fr,0.82fr]">
      <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(7,11,21,0.98))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Editorial Status</p>
        <h2 className="mt-4 font-display text-3xl font-black uppercase text-white">Official stories publish here after review</h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-text-secondary">
          Tournament announcements, result coverage, roster updates, sponsor announcements, and community features will
          appear here once they are approved for public release.
        </p>
        <div className="mt-6">
          <EmptyState
            title="No published news articles yet"
            description="Follow Discord and the event board while the first public newsroom posts are prepared."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
                <Link href="/events" className="btn-secondary">
                  View Events
                </Link>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid gap-4">
        {[
          "Official announcements and registration windows",
          "Tournament result stories and recap coverage",
          "Roster, sponsor, and community updates",
        ].map((item) => (
          <div
            key={item}
            className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] px-5 py-4"
          >
            <p className="font-display text-base font-black uppercase text-white">{item}</p>
          </div>
        ))}
        <ActionTile
          href="/media"
          title="Media Center"
          description="Published highlights and broadcasts will connect back to the news desk once the first public stories are live."
        />
      </div>
    </section>
  );
}

function MediaEmptyColumns() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.18fr,0.82fr]">
      <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(7,11,21,0.98))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Highlights Coming Soon</p>
        <h2 className="mt-4 font-display text-3xl font-black uppercase text-white">Official broadcasts and clips will appear here after publication</h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-text-secondary">
          This route is reserved for approved Bravo broadcasts, match highlights, interviews, and VOD coverage once the
          first public media set is ready.
        </p>
        <div className="mt-6">
          <EmptyState
            title="No published media items yet"
            description="Watch live, follow Discord, and keep the event board nearby while the first highlight set is prepared."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/live-stream" className="btn-primary">
                  Watch Live
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid gap-4">
        <ActionTile
          href="/live-stream"
          title="Live Broadcasts"
          description="Official Bravo streams will appear on the live page first, then connect back here as published VOD coverage."
        />
        <ActionTile
          href="/events"
          title="View Events"
          description="Keep the current registration windows and official event boards one click away while media coverage is being prepared."
        />
        <ActionTile
          href={BRAVO_YOUTUBE_URL}
          title="YouTube Channel"
          description="Follow the official channel for upcoming VOD drops, stream notifications, and highlight releases."
          external
        />
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
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Launch Status</p>
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
                <Link href={`/events/${spotlightEvent.slug}`} className="btn-secondary flex-1 justify-center">
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

function SponsorMetrics({
  eventCount,
  sponsorCount,
}: {
  eventCount: number;
  sponsorCount: number;
}) {
  const items = [
    { label: "Published Events", value: formatNumber(eventCount), detail: "Public event pages already live on the Bravo site." },
    { label: "Official Partner Cards", value: formatNumber(sponsorCount), detail: "Approved sponsor profiles visible to the public." },
    { label: "Support Routes", value: "3", detail: "Contact, Sponsor Kit, and Discord remain publicly available." },
    { label: "Flagship Focus", value: "PUBG PC", detail: "Bravo's public competitive product is anchored around PUBG PC." },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">{item.label}</p>
          <p className="mt-3 font-display text-3xl font-black uppercase text-white">{item.value}</p>
          <p className="mt-3 text-sm leading-7 text-text-muted">{item.detail}</p>
        </div>
      ))}
    </section>
  );
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
    >
      {article.imageUrl ? (
        <ManagedImage
          src={article.imageUrl}
          alt={article.title}
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          wrapperClassName="h-52 w-full"
          className="object-cover"
        />
      ) : (
        <div className="h-52 bg-[radial-gradient(circle_at_20%_18%,rgba(30,123,255,0.18),transparent_30%),linear-gradient(180deg,rgba(10,16,30,0.96),rgba(7,11,21,0.98))]" />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
            {article.category}
          </span>
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDate(article.publishedAt ?? article.date)}</p>
        </div>
        <h2 className="mt-4 font-display text-2xl font-black uppercase leading-tight text-white">{article.title}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">{article.excerpt?.trim() || article.summary}</p>
      </div>
    </Link>
  );
}

function MediaCard({ item }: { item: PlatformMediaItem }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))]">
      {item.imageUrl ? (
        <ManagedImage
          src={item.imageUrl}
          alt={item.title}
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          wrapperClassName="h-52 w-full"
          className="object-cover"
        />
      ) : (
        <div className="relative flex h-52 items-end bg-[radial-gradient(circle_at_20%_18%,rgba(30,123,255,0.18),transparent_30%),linear-gradient(180deg,rgba(10,16,30,0.96),rgba(7,11,21,0.98))] p-5">
          <span className="inline-flex rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
            {item.kind}
          </span>
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
            {item.category}
          </span>
          {item.duration ? <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{item.duration}</p> : null}
        </div>
        <h2 className="mt-4 font-display text-2xl font-black uppercase leading-tight text-white">{item.title}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">{item.summary}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/media/${item.slug}`} className="btn-primary">
            View Details
          </Link>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary">
              Open Media
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EventsLandingPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const query = readSearchParam(searchParams.q).trim().toLowerCase();
  const status = readSearchParam(searchParams.status, "all");
  const publicEvents = hub.events.filter((event) => event.state === "published").sort((firstValue, secondValue) =>
    (secondValue.startDate ?? "").localeCompare(firstValue.startDate ?? "")
  );
  const filteredEvents = publicEvents.filter((event) => {
    if (status !== "all" && event.status !== status) {
      return false;
    }

    if (query && !`${event.name} ${event.type} ${event.region}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
  const featuredEvent =
    filteredEvents.find((event) => canRegisterForEvent(event)) ??
    filteredEvents.find((event) => event.status !== "completed") ??
    publicEvents.find((event) => canRegisterForEvent(event)) ??
    publicEvents.find((event) => event.status !== "completed") ??
    publicEvents[0] ??
    null;
  const activeEvents = filteredEvents.filter((event) => event.status !== "completed");
  const completedEvents = filteredEvents.filter((event) => event.status === "completed");
  const upcomingCount = publicEvents.filter((event) => canRegisterForEvent(event)).length;
  const completedCount = publicEvents.filter((event) => event.status === "completed").length;

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="Compete. Connect. Conquer."
          title="Events"
          description="Join Nepal&apos;s biggest PUBG PC esports tournaments, register for official Bravo events, and follow public competition updates as they go live."
          primaryAction={
            featuredEvent && canRegisterForEvent(featuredEvent) ? (
              <Link href={registrationHref(featuredEvent)} className="btn-primary">
                Register Team
              </Link>
            ) : (
              <Link href={featuredEvent ? `/events/${featuredEvent.slug}` : "/events"} className="btn-primary">
                View Event Details
              </Link>
            )
          }
          secondaryAction={<Link href="/rules" className="btn-secondary">View Rules</Link>}
        >
          {featuredEvent ? (
            <SpotlightEventCard event={featuredEvent} />
          ) : (
            <div className="rounded-[28px] border border-white/[0.08] bg-black/25 p-6">
              <EmptyState
                title="Public event cards are being prepared"
                description="The next official Bravo registration window will appear here once it is published."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                      Join Discord
                    </a>
                    <Link href="/rules" className="btn-secondary">
                      View Rules
                    </Link>
                  </div>
                }
              />
            </div>
          )}
        </LaunchSurface>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Published Events</p>
            <p className="mt-3 font-display text-3xl font-black uppercase text-white">{formatNumber(publicEvents.length)}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Registration Windows</p>
            <p className="mt-3 font-display text-3xl font-black uppercase text-white">{formatNumber(upcomingCount)}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Completed Events</p>
            <p className="mt-3 font-display text-3xl font-black uppercase text-white">{formatNumber(completedCount)}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Official Partner</p>
            <p className="mt-3 font-display text-2xl font-black uppercase text-white">
              {hub.sponsors.find((sponsor) => sponsor.showOnSponsorsPage)?.name ?? "Bravo Partners"}
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px_auto]">
            <CategoryPills
              pathname="/events"
              activeValue={status}
              query={query}
              paramName="status"
              items={[
                { label: "All", value: "all" },
                { label: "Upcoming", value: "upcoming" },
                { label: "Completed", value: "completed" },
              ]}
            />
            <label className="flex items-center gap-3 rounded-[16px] border border-white/[0.08] bg-black/20 px-4 py-3">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                aria-label="Search events"
                name="q"
                defaultValue={readSearchParam(searchParams.q)}
                placeholder="Search events..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
              />
            </label>
            <button type="submit" className="btn-primary h-full min-h-[48px]">
              Apply
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Upcoming & Active</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Registration and event board access</h2>
            </div>
            {featuredEvent && canRegisterForEvent(featuredEvent) ? (
              <Link
                href={registrationHref(featuredEvent)}
                className="text-sm font-black uppercase tracking-[0.14em] text-accent-blue-light transition hover:text-white"
              >
                Register Your Team
              </Link>
            ) : null}
          </div>
          {activeEvents.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {activeEvents.map((event, index) => (
                <EventGridCard key={event.id} event={event} accent={index === 0 ? "blue" : "green"} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active public event cards right now"
              description="The next official Bravo registration window will appear here as soon as it is published."
            />
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Archived Events</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Completed public event boards</h2>
            </div>
          </div>
          {completedEvents.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {completedEvents.map((event) => (
                <EventGridCard key={event.id} event={event} accent="gold" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Completed event recaps will appear here"
              description="Archived Bravo event boards will move into this lane once public recap coverage is ready."
            />
          )}
        </section>
      </div>
    </main>
  );
}

export function NewsLandingPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const queryValue = readSearchParam(searchParams.q).trim();
  const query = queryValue.toLowerCase();
  const category = readSearchParam(searchParams.category, "all");
  const hasNews = hub.news.length > 0;
  const filteredArticles = hub.news.filter((article) => {
    if (category !== "all" && article.category !== category) {
      return false;
    }

    if (query && !`${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
  const featuredArticle = filteredArticles[0] ?? hub.news[0] ?? null;

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="News Desk"
          title="News"
          description="Stay updated with official Bravo Gaming Esports announcements, tournament coverage, registration windows, and public community updates."
          primaryAction={<Link href="/events" className="btn-primary">View Events</Link>}
          secondaryAction={<a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">Follow Updates</a>}
        >
          <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
            <PublicBreadcrumbs items={["Home", "News"]} />
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))]">
              {featuredArticle?.imageUrl ? (
                <ManagedImage
                  src={featuredArticle.imageUrl}
                  alt={featuredArticle.title}
                  sizes="(min-width: 1280px) 45vw, 100vw"
                  wrapperClassName="h-64 w-full"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-64 items-end bg-[radial-gradient(circle_at_22%_18%,rgba(30,123,255,0.18),transparent_30%),linear-gradient(180deg,rgba(10,16,30,0.96),rgba(7,11,21,0.98))] p-5">
                  <span className="inline-flex rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
                    {featuredArticle ? featuredArticle.category : "Editorial Desk"}
                  </span>
                </div>
              )}
              <div className="p-5">
                <h2 className="font-display text-3xl font-black uppercase leading-tight text-white">
                  {featuredArticle ? featuredArticle.title : "Official stories will appear here after publication"}
                </h2>
                <p className="mt-4 text-sm leading-8 text-text-secondary">
                  {featuredArticle
                    ? featuredArticle.excerpt?.trim() || featuredArticle.summary
                    : "Tournament announcements, public result stories, and sponsor updates will be published here once the first newsroom set is approved."}
                </p>
              </div>
            </div>
          </div>
        </LaunchSurface>

        {hasNews ? (
          <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] p-4">
            <form method="get" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px_auto]">
              <CategoryPills
                pathname="/news"
                activeValue={category}
                query={queryValue}
                items={[
                  { label: "All News", value: "all" },
                  { label: "Announcements", value: "Announcements" },
                  { label: "Tournaments", value: "Tournaments" },
                  { label: "Updates", value: "Updates" },
                  { label: "Results", value: "Results" },
                ]}
              />
              <label className="flex items-center gap-3 rounded-[16px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <Search className="h-4 w-4 text-text-muted" />
                <input
                  aria-label="Search news"
                  name="q"
                  defaultValue={queryValue}
                  placeholder="Search news..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
                />
              </label>
              <button type="submit" className="btn-primary h-full min-h-[48px]">
                Search
              </button>
            </form>
          </section>
        ) : null}

        {!hasNews ? (
          <NewsEmptyColumns />
        ) : filteredArticles.length === 0 ? (
          <EmptyState
            title="No stories match the current filter"
            description="Try a different category or search term to browse the current public news feed."
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-3">
            {filteredArticles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export function MediaCenterLandingPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const category = readSearchParam(searchParams.category, "all");
  const queryValue = readSearchParam(searchParams.q).trim();
  const query = queryValue.toLowerCase();
  const hasMedia = hub.media.length > 0;
  const filteredMedia = hub.media.filter((item) => {
    if (category !== "all" && item.category !== category && item.kind !== category) {
      return false;
    }

    if (query && !`${item.title} ${item.summary} ${item.category} ${item.kind}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
  const featuredMedia = filteredMedia[0] ?? hub.media[0] ?? null;

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="Media Center"
          title="Media Center"
          description="Watch Bravo Gaming Esports broadcasts, highlights, interviews, and featured content once each item is approved for public release."
          primaryAction={<Link href="/live-stream" className="btn-primary">Watch Live</Link>}
          secondaryAction={<Link href="/events" className="btn-secondary">Browse Events</Link>}
        >
          <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
            <PublicBreadcrumbs items={["Home", "Media Center"]} />
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))]">
              {featuredMedia?.imageUrl ? (
                <ManagedImage
                  src={featuredMedia.imageUrl}
                  alt={featuredMedia.title}
                  sizes="(min-width: 1280px) 45vw, 100vw"
                  wrapperClassName="h-72 w-full"
                  className="object-cover"
                />
              ) : (
                <div className="relative h-72 bg-[radial-gradient(circle_at_22%_18%,rgba(30,123,255,0.18),transparent_30%),linear-gradient(180deg,rgba(10,16,30,0.96),rgba(7,11,21,0.98))]">
                  <div className="absolute left-5 top-5 inline-flex rounded-full border border-accent-blue/25 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
                    {featuredMedia?.kind ?? "Media Center"}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Bravo Media</p>
                      <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">
                        {featuredMedia ? featuredMedia.title : "Official stream coverage returns here"}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-text-secondary">
                        {featuredMedia ? featuredMedia.summary : "Broadcasts, highlights, interviews, and clips will appear here once Bravo publishes the first media package."}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white">
                      {featuredMedia ? featuredMedia.category : "No published media yet"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </LaunchSurface>

        {hasMedia ? (
          <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] p-4">
            <div className="grid gap-4 xl:grid-cols-[1fr,auto] xl:items-center">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Follow Our Channels</p>
                  <p className="mt-2 text-sm text-text-muted">
                    Discord, Instagram, and YouTube are the fastest routes for official Bravo content drops.
                  </p>
                </div>
                <HeroChannelRow />
              </div>
              <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex items-center gap-3 rounded-[16px] border border-white/[0.08] bg-black/20 px-4 py-3">
                  <Search className="h-4 w-4 text-text-muted" />
                  <input
                    aria-label="Search media"
                    name="q"
                    defaultValue={queryValue}
                    placeholder="Search media..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
                  />
                </label>
                <button type="submit" className="btn-primary h-full min-h-[48px]">
                  Search
                </button>
              </form>
            </div>
            <div className="mt-4">
              <CategoryPills
                pathname="/media"
                activeValue={category}
                query={queryValue}
                items={[
                  { label: "All Content", value: "all" },
                  { label: "Highlights", value: "Highlights" },
                  { label: "Broadcasts", value: "Broadcast" },
                  { label: "Interviews", value: "Interview" },
                  { label: "Clips", value: "Clip" },
                ]}
              />
            </div>
          </section>
        ) : null}

        {!hasMedia ? (
          <MediaEmptyColumns />
        ) : filteredMedia.length === 0 ? (
          <EmptyState
            title="No media items match the current filter"
            description="Try a different category or search term to browse the current public media feed."
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-3">
            {filteredMedia.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export function SponsorsLandingPage({ hub }: { hub: PlatformHubData }) {
  const publicSponsors = hub.sponsors.filter((sponsor) => sponsor.showOnSponsorsPage);
  const featuredSponsor = publicSponsors[0] ?? null;

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="Bravo Gaming Esports"
          title="Sponsors"
          description="Power Nepal&apos;s competitive spirit with official Bravo event partnerships, broadcast support, and community-facing sponsor placements built around PUBG PC."
          primaryAction={<Link href="/sponsor-kit" className="btn-primary">View Sponsor Kit</Link>}
          secondaryAction={<Link href="/contact" className="btn-secondary">Contact Bravo</Link>}
        >
          <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
            <PublicBreadcrumbs items={["Home", "Sponsors"]} />
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,14,28,0.98),rgba(5,8,16,0.99))]">
              {featuredSponsor ? (
                <SponsorWordmark sponsor={featuredSponsor} />
              ) : (
                <div className="p-6">
                  <EmptyState
                    title="Official partner cards are being finalized"
                    description="The sponsor kit and contact routes remain live while the first partner profile set is prepared."
                  />
                </div>
              )}
            </div>
          </div>
        </LaunchSurface>

        {publicSponsors.length > 0 ? (
          <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] p-5">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Official Partners</p>
            </div>
            <div className={joinClasses("mt-5 grid gap-4", publicSponsors.length === 1 ? "xl:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3")}>
              {publicSponsors.map((sponsor) => (
                <Link
                  key={sponsor.id}
                  href={`/sponsors/${sponsor.slug}`}
                  className="transition hover:opacity-90"
                >
                  <SponsorWordmark sponsor={sponsor} compact />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {featuredSponsor ? (
          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.98),rgba(5,8,16,0.99))]">
            <div className="grid gap-0 xl:grid-cols-[0.9fr,1.1fr]">
              <div className="p-6 sm:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Featured Partner</p>
                <h2 className="mt-4 font-display text-4xl font-black uppercase text-white">{featuredSponsor.name}</h2>
                <p className="mt-4 text-sm leading-8 text-text-secondary">{featuredSponsor.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/sponsors/${featuredSponsor.slug}`} className="btn-secondary">
                    View Partner Profile
                  </Link>
                  {featuredSponsor.websiteUrl ? (
                    <a href={featuredSponsor.websiteUrl} target="_blank" rel="noreferrer" className="btn-primary">
                      Visit Website
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="p-6">
                <SponsorWordmark sponsor={featuredSponsor} />
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Partnership Opportunities</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Tiered sponsor visibility</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
            {[
              {
                title: "Titanium Partner",
                detail: "Top-line branding for flagship events, broadcast naming, and major launch moments.",
              },
              {
                title: "Gold Partner",
                detail: "Strong event, social, and public-page visibility across active Bravo competition touchpoints.",
              },
              {
                title: "Silver Partner",
                detail: "A balanced package for consistent event presence and community-facing support.",
              },
              {
                title: "Community Partner",
                detail: "Always-on support around registrations, Discord announcements, and grassroots engagement.",
              },
            ].map((tier, index) => (
              <div
                key={tier.title}
                className={joinClasses(
                  "rounded-[24px] border p-5",
                  index === 1
                    ? "border-accent-yellow/20 bg-[linear-gradient(180deg,rgba(33,24,10,0.96),rgba(14,11,7,0.98))]"
                    : "border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))]"
                )}
              >
                <p className="font-display text-lg font-black uppercase text-white">{tier.title}</p>
                <p className="mt-3 text-sm leading-7 text-text-muted">{tier.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <SponsorMetrics
          eventCount={hub.events.filter((event) => event.state === "published").length}
          sponsorCount={publicSponsors.length}
        />

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,34,0.98),rgba(6,10,18,0.99))]">
          <div className="relative px-6 py-6 sm:px-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(30,123,255,0.18),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(20,126,245,0.1),transparent_24%)]" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Sponsor CTA</p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">
                  Let&apos;s build the future of esports together
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  Join forces with Bravo Gaming Esports and connect your brand with upcoming public event windows and the Nepal PUBG PC community.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/sponsor-kit" className="btn-primary min-w-[12rem] justify-center">
                  View Sponsor Kit
                </Link>
                <Link href="/contact" className="btn-secondary min-w-[12rem] justify-center">
                  Contact Bravo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
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
  const publishedEventCount = hub.events.filter((event) => event.state === "published").length;

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="#1 PUBG PC Esports Platform In Nepal"
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
                    <p className="mt-2 text-sm text-white">{spotlightEvent.teamsCount > 0 ? `${formatNumber(spotlightEvent.teamsCount)} Teams` : "To be announced"}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/events/${spotlightEvent.slug}`} className="btn-secondary flex-1 justify-center">
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
              {partners.map((partner) => (
                <Link key={partner.id} href={`/sponsors/${partner.slug}`} className="transition hover:opacity-90">
                  <SponsorWordmark sponsor={partner} compact />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Public Event Pages</p>
            <p className="mt-3 font-display text-3xl font-black uppercase text-white">{formatNumber(publishedEventCount)}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Official Partners</p>
            <p className="mt-3 font-display text-3xl font-black uppercase text-white">{formatNumber(partners.length)}</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Registration Window</p>
            <p className="mt-3 font-display text-2xl font-black uppercase text-white">
              {registrationOpen ? "Open" : "No Open Event"}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Policy Links</p>
            <p className="mt-3 font-display text-2xl font-black uppercase text-white">Ready</p>
          </div>
        </section>

        <PubgLaunchSections
          title="Official PUBG standings and analytics are not published yet"
          description="Instead of filling this page with repeated zero panels, Bravo keeps the public hub focused on registration, public event boards, sponsor visibility, and policy access until verified results are available."
          featureTitle="No published PUBG result set yet"
          featureDescription="Leaderboards, teams, players, and detailed match analytics will unlock automatically once the first verified public results are published."
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

export function PubgTeamsLaunchPage({ hub }: { hub: PlatformHubData }) {
  const spotlightEvent = findSpotlightEvent(hub.events);
  const registrationOpen = Boolean(spotlightEvent && canRegisterForEvent(spotlightEvent));

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="PUBG Teams"
          title="Teams"
          description="Published team rankings, tags, rosters, and results-based profiles will appear here after official Bravo PUBG standings go live."
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
          <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
            <PublicBreadcrumbs items={["Home", "PUBG", "Teams"]} />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Team Profiles", detail: "Unlock after published standings" },
                { label: "Roster Previews", detail: "Attached to official public team cards" },
                { label: "Form & Results", detail: "Visible after verified match publication" },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-4">
                  <p className="font-display text-lg font-black uppercase text-white">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </LaunchSurface>

        <PubgLaunchSections
          title="Official team cards are waiting on published results"
          description="Bravo will not show fake ranked team panels publicly. The teams directory will open once public match results are available and team standings can be shown honestly."
          featureTitle="No published team directory yet"
          featureDescription="Follow the public event board, keep Discord nearby, and return when the first public results unlock official team cards."
          spotlightEvent={spotlightEvent}
          quickLinks={[
            { href: "/pubg/leaderboards", title: "Leaderboards", description: "Team rankings will appear here first once the first public result set is published." },
            { href: "/rules", title: "Rules", description: "Review team eligibility, conduct, and event format rules before joining the next lobby." },
            { href: BRAVO_DISCORD_URL, title: "Join Discord", description: "Use the official community server for room calls, roster coordination, and manual help.", external: true },
          ]}
        />
      </div>
    </main>
  );
}

export function PubgPlayersLaunchPage({ hub }: { hub: PlatformHubData }) {
  const spotlightEvent = findSpotlightEvent(hub.events);
  const registrationOpen = Boolean(spotlightEvent && canRegisterForEvent(spotlightEvent));

  return (
    <main className="page-shell pb-14 pt-6">
      <div className="page-stack gap-5">
        <LaunchSurface
          eyebrow="PUBG Players"
          title="Players"
          description="Official player profiles, public fragging stats, and result-backed scouting cards will appear here once Bravo publishes verified PUBG player data."
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
          <div className="rounded-[28px] border border-white/[0.08] bg-black/20 p-5">
            <PublicBreadcrumbs items={["Home", "PUBG", "Players"]} />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Player Cards", detail: "Go live after published result approval" },
                { label: "Team Links", detail: "Each player profile connects back to the official team card" },
                { label: "Best Match Context", detail: "Unlocked only with real published match logs" },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,21,0.98))] p-4">
                  <p className="font-display text-lg font-black uppercase text-white">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </LaunchSurface>

        <PubgLaunchSections
          title="Player scouting opens after verified public data is available"
          description="Bravo keeps this page intentionally clean until player stats can be shown with real event, team, and match context rather than empty stat blocks."
          featureTitle="No published player directory yet"
          featureDescription="Return after the first verified PUBG result set is live to browse public player profiles and official standings-backed output."
          spotlightEvent={spotlightEvent}
          quickLinks={[
            { href: "/pubg/leaderboards?view=players", title: "Player Board", description: "Public player rankings will appear here once results are published." },
            { href: "/anti-cheat", title: "Anti-Cheat", description: "Review Bravo's integrity standards before the next public competition window." },
            { href: BRAVO_DISCORD_URL, title: "Join Discord", description: "Stay close to room updates and player-facing support through the official Discord server.", external: true },
          ]}
        />
      </div>
    </main>
  );
}
