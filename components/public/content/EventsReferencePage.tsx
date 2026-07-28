import {
  PublicActionLink,
  PublicEmptyState,
  PublicMetric,
  PublicPageHero,
  PublicSectionHeader,
  PublicStatusBadge,
  formatPublicDateRange,
  formatPublicNumber,
  joinClasses,
  readSearchParam,
  type SearchParamDictionary,
} from "@/components/public/PublicDesignSystem";
import ManagedImage from "@/components/ui/ManagedImage";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PlatformEvent, PlatformHubData } from "@/lib/platform-hub";
import { getCanonicalPublicEventHref } from "@/lib/public-links";
import { CalendarDays, CirclePlay, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import {
  dateValue,
  FilterTabs,
  isCompatibilityFallback,
  meaningfulText,
  normalizePage,
  PaginationNav,
  UNAVAILABLE,
} from "./ContentPageShared";

const EVENTS_PAGE_SIZE = 8;

function EventStatus({ status }: { status: PlatformEvent["status"] }) {
  const config = {
    live: { label: "Ongoing", tone: "green" as const },
    upcoming: { label: "Upcoming", tone: "blue" as const },
    completed: { label: "Completed", tone: "neutral" as const },
    planned: { label: "Planned", tone: "amber" as const },
  }[status];

  return <PublicStatusBadge tone={config.tone}>{config.label}</PublicStatusBadge>;
}

function eventMatchesStatus(event: PlatformEvent, status: string) {
  if (status === "all") return true;
  if (status === "upcoming") return event.status === "upcoming" || event.status === "planned";
  if (status === "ongoing") return event.status === "live";
  return event.status === status;
}

function sortEvents(events: PlatformEvent[], sort: string) {
  const nextEvents = [...events];
  if (sort === "oldest") {
    return nextEvents.sort((first, second) => dateValue(first.startDate) - dateValue(second.startDate));
  }
  if (sort === "name") {
    return nextEvents.sort((first, second) => first.name.localeCompare(second.name));
  }
  if (sort === "status") {
    const order: Record<PlatformEvent["status"], number> = { live: 0, upcoming: 1, planned: 2, completed: 3 };
    return nextEvents.sort(
      (first, second) =>
        order[first.status] - order[second.status] || dateValue(second.startDate) - dateValue(first.startDate),
    );
  }
  return nextEvents.sort((first, second) => dateValue(second.startDate) - dateValue(first.startDate));
}

function selectFeaturedEvent(events: PlatformEvent[]) {
  return (
    events.find((event) => event.status === "live") ??
    events.find((event) => event.status === "upcoming" && event.featured) ??
    events.find((event) => event.status === "upcoming") ??
    events.find((event) => event.featured) ??
    events[0] ??
    null
  );
}

function eventLeadLabel(event: PlatformEvent) {
  if (event.featured) return "Featured Event";
  if (event.status === "live") return "Ongoing Event";
  if (event.status === "upcoming") return "Next Published Event";
  if (event.status === "planned") return "Planned Event";
  return "Latest Event Record";
}

function eventDurationLabel(event: PlatformEvent) {
  const start = dateValue(event.startDate);
  const end = dateValue(event.endDate);
  if (!start || !end || end < start) return UNAVAILABLE;
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return `${formatPublicNumber(days)} ${days === 1 ? "day" : "days"}`;
}

function EventVisual({
  event,
  className,
  priority = false,
}: {
  event: PlatformEvent;
  className: string;
  priority?: boolean;
}) {
  if (event.bannerUrl) {
    return (
      <ManagedImage
        src={event.bannerUrl}
        alt={`${event.name} event artwork`}
        priority={priority}
        sizes="(min-width: 1280px) 42vw, (min-width: 768px) 50vw, 100vw"
        wrapperClassName={className}
        className="object-cover"
      />
    );
  }

  return (
    <div
      className={joinClasses(
        className,
        "relative overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(8,102,255,0.25),transparent_34%),linear-gradient(145deg,#071522,#020812)]",
      )}
      role="img"
      aria-label={`${event.name} has no published event artwork`}
    >
      <Trophy className="absolute bottom-5 right-5 h-16 w-16 text-accent-blue/25" aria-hidden="true" />
      <span className="absolute bottom-4 left-4 rounded-[3px] border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
        Artwork pending
      </span>
    </div>
  );
}

function FeaturedEvent({ event }: { event: PlatformEvent }) {
  return (
    <section className="public-panel overflow-hidden border-accent-blue/30">
      <div className="grid lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
        <EventVisual event={event} priority className="h-52 w-full lg:h-full lg:min-h-[300px]" />
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PublicStatusBadge tone="blue">{eventLeadLabel(event)}</PublicStatusBadge>
              <EventStatus status={event.status} />
            </div>
            <p className="public-kicker mt-5">{event.type || event.gameName}</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-[1.02] text-white sm:text-4xl">
              {event.name}
            </h2>
            <p className="mt-4 text-sm leading-7 text-text-secondary">{event.summary}</p>
          </div>
          <dl className="grid content-start gap-3 text-sm">
            <div className="border-b border-white/10 pb-3">
              <dt className="public-stat-label">Date</dt>
              <dd className="mt-1 text-white">{formatPublicDateRange(event.startDate, event.endDate)}</dd>
            </div>
            <div className="border-b border-white/10 pb-3">
              <dt className="public-stat-label">Duration</dt>
              <dd className="mt-1 text-white">{eventDurationLabel(event)}</dd>
            </div>
            <div className="border-b border-white/10 pb-3">
              <dt className="public-stat-label">Format</dt>
              <dd className="mt-1 text-white">{event.type || event.gameName}</dd>
            </div>
            <div className="border-b border-white/10 pb-3">
              <dt className="public-stat-label">Team entries</dt>
              <dd className="mt-1 text-white">
                {event.teamsCount > 0 ? formatPublicNumber(event.teamsCount) : UNAVAILABLE}
              </dd>
            </div>
            <div>
              <dt className="public-stat-label">Prize pool</dt>
              <dd className="mt-1 text-white">{meaningfulText(event.prizePool)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <PublicActionLink href={getCanonicalPublicEventHref(event)}>View Details</PublicActionLink>
            {event.analyticsHref ? (
              <PublicActionLink href={event.analyticsHref} variant="secondary">
                View Published Results
              </PublicActionLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: PlatformEvent }) {
  return (
    <article className="public-card flex min-w-0 flex-col overflow-hidden">
      <div className="relative">
        <EventVisual event={event} className="h-36 w-full" />
        <div className="absolute left-3 top-3">
          <EventStatus status={event.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="public-kicker">{event.type || event.gameName}</p>
        <h3 className="mt-2 line-clamp-2 font-display text-xl font-bold uppercase leading-tight text-white">
          {event.name}
        </h3>
        <dl className="mt-4 grid gap-2 text-xs text-text-secondary">
          <div className="flex items-start justify-between gap-3">
            <dt>Date</dt>
            <dd className="text-right text-white">{formatPublicDateRange(event.startDate, event.endDate)}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt>Format</dt>
            <dd className="text-right text-white">{event.type || event.gameName}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt>Team entries</dt>
            <dd className="text-right text-white">
              {event.teamsCount > 0 ? formatPublicNumber(event.teamsCount) : UNAVAILABLE}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex gap-2 pt-5">
          <PublicActionLink href={getCanonicalPublicEventHref(event)} variant="secondary" className="flex-1 justify-center">
            View Details
          </PublicActionLink>
          {event.analyticsHref ? (
            <PublicActionLink
              href={event.analyticsHref}
              className="flex-1 justify-center"
              externalLabel={event.analyticsHref.startsWith("http") ? " opens in a new tab" : undefined}
            >
              Results
            </PublicActionLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ArchivedEventCard({ event }: { event: PlatformEvent }) {
  return (
    <article className="public-card min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <PublicStatusBadge>Completed</PublicStatusBadge>
        <span className="text-right text-xs text-text-muted">
          {formatPublicDateRange(event.startDate, event.endDate)}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 font-display text-lg font-bold uppercase leading-tight text-white">
        {event.name}
      </h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-muted">{event.summary}</p>
      <dl className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs">
        <dt className="text-text-muted">Winner</dt>
        <dd className="truncate text-right font-semibold text-white">{meaningfulText(event.topTeamName)}</dd>
      </dl>
      <div className="mt-4">
        <PublicActionLink href={getCanonicalPublicEventHref(event)} variant="secondary" className="w-full justify-center">
          View Recap
        </PublicActionLink>
      </div>
    </article>
  );
}

export function EventsReferencePage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const publicEvents = hub.events.filter(
    (event) => event.state === "published" && !isCompatibilityFallback(event.id),
  );
  const statusValue = readSearchParam(searchParams.status, "all").toLowerCase();
  const status = ["all", "upcoming", "ongoing", "completed"].includes(statusValue) ? statusValue : "all";
  const sortValue = readSearchParam(searchParams.sort, "latest").toLowerCase();
  const sort = ["latest", "oldest", "name", "status"].includes(sortValue) ? sortValue : "latest";
  const queryValue = readSearchParam(searchParams.q).trim();
  const query = queryValue.toLowerCase();
  const defaultFeaturedEvent = selectFeaturedEvent(publicEvents);
  const filteredEvents = sortEvents(
    publicEvents.filter(
      (event) =>
        eventMatchesStatus(event, status) &&
        (!query || `${event.name} ${event.type} ${event.gameName} ${event.region}`.toLowerCase().includes(query)),
    ),
    sort,
  );
  const filtersActive = status !== "all" || Boolean(query);
  const featuredEvent = filtersActive ? selectFeaturedEvent(filteredEvents) : defaultFeaturedEvent;
  const listingEvents = filteredEvents.filter((event) => event.id !== featuredEvent?.id);
  const totalPages = Math.max(1, Math.ceil(listingEvents.length / EVENTS_PAGE_SIZE));
  const page = normalizePage(searchParams.page, totalPages);
  const pageEvents = listingEvents.slice((page - 1) * EVENTS_PAGE_SIZE, page * EVENTS_PAGE_SIZE);
  const activePageEvents = pageEvents.filter((event) => event.status !== "completed");
  const archivedPageEvents = pageEvents.filter((event) => event.status === "completed");
  const upcomingCount = publicEvents.filter(
    (event) => event.status === "upcoming" || event.status === "planned",
  ).length;
  const ongoingCount = publicEvents.filter((event) => event.status === "live").length;
  const completedCount = publicEvents.filter((event) => event.status === "completed").length;
  const teamEntries = publicEvents.reduce((total, event) => total + Math.max(0, event.teamsCount), 0);

  return (
    <main className="public-page">
      <PublicPageHero
        breadcrumbCurrent="Events"
        eyebrow="Compete. Connect. Conquer."
        title="Events"
        description="Explore published Bravo Gaming Esports tournaments, schedules, event details, and verified competition results."
        imageUrl={defaultFeaturedEvent?.bannerUrl}
        actions={
          <>
            <PublicActionLink href="#event-board">Browse Events</PublicActionLink>
            <PublicActionLink href="/rules" variant="secondary">
              Competition Rules
            </PublicActionLink>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3">
            <PublicMetric
              label="Published events"
              value={formatPublicNumber(publicEvents.length)}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <PublicMetric
              label="Published team entries"
              value={teamEntries > 0 ? formatPublicNumber(teamEntries) : UNAVAILABLE}
              detail="Across event records"
              icon={<Users className="h-5 w-5" />}
            />
          </div>
        }
      />

      <div className="public-container space-y-6 py-6">
        <section id="event-board" aria-label="Event controls" className="scroll-mt-24">
          <div className="public-panel p-3 sm:p-4">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)] xl:items-center">
              <FilterTabs
                pathname="/events"
                searchParams={searchParams}
                paramName="status"
                activeValue={status}
                label="Filter events by status"
                items={[
                  { label: "All", value: "all" },
                  { label: "Upcoming", value: "upcoming" },
                  { label: "Ongoing", value: "ongoing" },
                  { label: "Completed", value: "completed" },
                ]}
              />
              <form
                action="/events"
                method="get"
                className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
              >
                {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
                <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-[4px] border border-white/15 bg-black/25 px-3 transition focus-within:border-accent-blue focus-within:ring-2 focus-within:ring-accent-blue/20">
                  <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  <span className="sr-only">Search events</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={queryValue}
                    placeholder={"Search events\u2026"}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
                  />
                </label>
                <label>
                  <span className="sr-only">Sort events</span>
                  <select name="sort" defaultValue={sort} className="public-filter-control min-h-10 w-full">
                    <option value="latest">Latest date</option>
                    <option value="oldest">Oldest date</option>
                    <option value="name">Event name</option>
                    <option value="status">Status</option>
                  </select>
                </label>
                <button type="submit" className="btn-primary min-h-10 !px-4 !py-2">
                  Apply
                </button>
              </form>
            </div>
          </div>
        </section>

        {featuredEvent ? (
          <FeaturedEvent event={featuredEvent} />
        ) : publicEvents.length === 0 ? (
          <PublicEmptyState
            title="No published events yet"
            description="Official event cards will appear here after schedules and public details are approved."
            action={
              <PublicActionLink href={BRAVO_DISCORD_URL} variant="discord">
                Follow Event Updates
              </PublicActionLink>
            }
          />
        ) : null}

        <section aria-label="Event summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <PublicMetric
            label="Published events"
            value={formatPublicNumber(publicEvents.length)}
            icon={<Trophy className="h-5 w-5" />}
          />
          <PublicMetric
            label="Upcoming"
            value={formatPublicNumber(upcomingCount)}
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <PublicMetric
            label="Ongoing"
            value={formatPublicNumber(ongoingCount)}
            icon={<CirclePlay className="h-5 w-5" />}
          />
          <PublicMetric
            label="Completed"
            value={formatPublicNumber(completedCount)}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <PublicMetric
            label="Team entries"
            value={teamEntries > 0 ? formatPublicNumber(teamEntries) : UNAVAILABLE}
            icon={<Users className="h-5 w-5" />}
          />
          <PublicMetric
            label="Prize pool"
            value={UNAVAILABLE}
            icon={<Trophy className="h-5 w-5" />}
          />
        </section>

        <section className="space-y-5">
          <PublicSectionHeader
            eyebrow="Upcoming & Ongoing Events"
            title="Competition Board"
            action={
              <span className="text-xs text-text-muted">
                {listingEvents.length} additional published {listingEvents.length === 1 ? "result" : "results"}
              </span>
            }
          />

          {listingEvents.length === 0 ? (
            <PublicEmptyState
              title={
                publicEvents.length === 0
                  ? "No public events are available"
                  : filteredEvents.length > 0
                    ? "Featured event shown above"
                    : "No events match these filters"
              }
              description={
                publicEvents.length === 0
                  ? "The next approved Bravo event will appear here after publication."
                  : filteredEvents.length > 0
                    ? "No additional published event records match the current filters."
                  : "Try another status, search phrase, or sort option."
              }
            />
          ) : (
            <>
              {activePageEvents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {activePageEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : status !== "completed" ? (
                <PublicEmptyState
                  compact
                  title="No upcoming or ongoing events match"
                  description="Completed event records remain available in the archive below."
                />
              ) : null}

              {archivedPageEvents.length > 0 ? (
                <section className="space-y-4">
                  <PublicSectionHeader eyebrow="Archived Events" title="Completed Event Records" />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {archivedPageEvents.map((event) => (
                      <ArchivedEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ) : null}

              <PaginationNav
                pathname="/events"
                searchParams={searchParams}
                currentPage={page}
                totalPages={totalPages}
              />
            </>
          )}
        </section>

        <section className="public-cta">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="public-kicker">Tournament Partnerships</p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase text-white">
                Host your tournament with Bravo Gaming
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Discuss tournament operations, public event coverage, rules, and partnership requirements with the Bravo
                team.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PublicActionLink href="/contact">Contact Bravo</PublicActionLink>
              <PublicActionLink href="/tournament-partners" variant="secondary">
                Learn More
              </PublicActionLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
