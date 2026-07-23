import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type {
  PubgHubEvent,
  PubgHubEventState,
  PubgHubEventStatus,
  PubgHubMapStat,
  PubgHubMatch,
  PubgHubPlayer,
  PubgHubRecentMatch,
  PubgHubSource,
  PubgHubTeam,
} from "@/lib/pubg-hub";

type SearchParamValue = string | string[] | undefined;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Kathmandu",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kathmandu",
});

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function readSearchParam(value: SearchParamValue, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export function buildHref(pathname: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export function formatDecimal(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.0";
}

export function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Time TBA";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${dateTimeFormatter.format(parsed)} NPT`;
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "Schedule TBA";
  }

  const startLabel = formatDate(startDate);
  if (!endDate) {
    return startLabel;
  }

  const startParsed = new Date(startDate);
  const endParsed = new Date(endDate);

  if (Number.isNaN(startParsed.getTime()) || Number.isNaN(endParsed.getTime())) {
    return `${startLabel} - ${formatDate(endDate)}`;
  }

  if (startParsed.toDateString() === endParsed.toDateString()) {
    return startLabel;
  }

  return `${startLabel} - ${formatDate(endDate)}`;
}

export function sourceLabel(source: PubgHubSource) {
  return source === "supabase" ? "Official published results" : "Published results archive";
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 font-display text-[1.55rem] font-black uppercase text-white sm:text-[1.8rem]">
          {title}
        </h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatTone({
  tone = "blue",
}: {
  tone?: "blue" | "green" | "red" | "yellow";
}) {
  return tone === "green"
    ? "text-accent-green"
    : tone === "red"
      ? "text-accent-red"
      : tone === "yellow"
        ? "text-accent-yellow"
        : "text-accent-blue-light";
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "blue",
  compact = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "blue" | "green" | "red" | "yellow";
  compact?: boolean;
}) {
  return (
    <div className={joinClasses("stat-pill", compact ? "p-4" : "p-5")}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={joinClasses("mt-3 font-mono-stat text-2xl", StatTone({ tone }))}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-6 text-text-muted">{detail}</p> : null}
    </div>
  );
}

export function PageHero({
  badge,
  title,
  description,
  actions,
  stats,
  aside,
}: {
  badge: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: string | number; tone?: "blue" | "green" | "red" | "yellow" }>;
  aside?: ReactNode;
}) {
  return (
    <section className="hero-banner">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(47,152,255,0.18),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(20,126,245,0.14),transparent_24%)]" />
      <div className="relative grid gap-5 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="min-w-0">
          <span className="brand-badge">{badge}</span>
          <h1 className="hero-h1 mt-4">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base sm:leading-8">
            {description}
          </p>
          {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
          {stats?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} compact />
              ))}
            </div>
          ) : null}
        </div>
        {aside ? (
          <div className="rounded-[24px] border border-white/[0.08] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function toneClassForStatus(status: PubgHubEventStatus) {
  if (status === "ongoing") {
    return "border-accent-red/30 bg-accent-red/10 text-white";
  }

  if (status === "finished") {
    return "border-accent-green/30 bg-accent-green/10 text-accent-green";
  }

  return "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light";
}

function toneClassForState(state: PubgHubEventState) {
  if (state === "draft") {
    return "border-white/10 bg-white/5 text-text-muted";
  }

  if (state === "locked") {
    return "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow";
  }

  return "border-accent-green/30 bg-accent-green/10 text-accent-green";
}

export function StatusPill({ status }: { status: PubgHubEventStatus }) {
  const label = status === "ongoing" ? "Current" : status === "finished" ? "Completed" : "Upcoming";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        toneClassForStatus(status)
      )}
    >
      {status === "ongoing" ? <span className="live-dot h-1.5 w-1.5" /> : null}
      {label}
    </span>
  );
}

export function StatePill({ state }: { state: PubgHubEventState }) {
  const label = state === "draft" ? "Draft" : state === "locked" ? "Locked" : "Published";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        toneClassForState(state)
      )}
    >
      {label}
    </span>
  );
}

export function SyncPill({ syncStatus }: { syncStatus: PubgHubEvent["syncStatus"] }) {
  const className =
    syncStatus === "synced"
      ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
      : syncStatus === "awaiting_approval"
        ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
        : syncStatus === "scheduled"
          ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light"
          : "border-white/10 bg-white/5 text-text-muted";

  const label =
    syncStatus === "synced"
      ? "Synced"
      : syncStatus === "awaiting_approval"
        ? "Awaiting Approval"
        : syncStatus === "scheduled"
          ? "Scheduled"
          : "Draft";

  return (
    <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", className)}>
      {label}
    </span>
  );
}

export function FormPill({ label }: { label: string }) {
  const className =
    label === "Surging"
      ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light"
      : label === "Steady"
        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
        : label === "Rising"
          ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
          : "border-white/10 bg-white/5 text-text-muted";

  return (
    <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", className)}>
      {label}
    </span>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const className =
    rank === 1
      ? "border-accent-blue/35 bg-accent-blue/10 text-white"
      : rank <= 4
        ? "border-accent-blue/20 bg-accent-blue/5 text-accent-blue-light"
        : "border-white/10 bg-white/5 text-text-muted";

  return (
    <span className={joinClasses("inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1 font-mono-stat text-xs", className)}>
      #{rank}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 p-6 text-center">
      <p className="font-display text-lg font-black uppercase text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function TrendBars({
  values,
  tone = "blue",
  height = 42,
}: {
  values: number[];
  tone?: "blue" | "green" | "red" | "yellow";
  height?: number;
}) {
  if (values.length === 0) {
    return <div className="h-12 rounded-[18px] border border-dashed border-white/10 bg-black/10" />;
  }

  const maxValue = Math.max(...values, 1);
  const barClass =
    tone === "green"
      ? "from-accent-green/40 to-accent-green"
      : tone === "red"
        ? "from-accent-red/40 to-accent-red"
        : tone === "yellow"
          ? "from-accent-yellow/40 to-accent-yellow"
          : "from-accent-blue/40 to-accent-blue-light";

  return (
    <div className="flex items-end gap-1.5">
      {values.map((value, index) => {
        const computedHeight = Math.max(8, Math.round((value / maxValue) * height));

        return (
          <div key={`${index}-${value}`} className="flex-1 rounded-full bg-white/5 p-[2px]">
            <div className={joinClasses("w-full rounded-full bg-gradient-to-t", barClass)} style={{ height: computedHeight }} />
          </div>
        );
      })}
    </div>
  );
}

function buildLinePoints(values: number[], width: number, height: number, inset: number) {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const spread = Math.max(1, maxValue - minValue);
  const usableWidth = width - inset * 2;
  const usableHeight = height - inset * 2;

  return values
    .map((value, index) => {
      const x = inset + (usableWidth * index) / Math.max(values.length - 1, 1);
      const y = height - inset - ((value - minValue) / spread) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

export function DualTrendChart({
  firstValues,
  secondValues,
  firstLabel,
  secondLabel,
}: {
  firstValues: number[];
  secondValues: number[];
  firstLabel: string;
  secondLabel: string;
}) {
  const width = 340;
  const height = 130;
  const maxLength = Math.max(firstValues.length, secondValues.length);

  if (maxLength === 0) {
    return (
      <EmptyState
        title="Recent form is not available yet"
        description="Recent form appears once enough official match data has been published."
      />
    );
  }

  const paddedFirst = [...firstValues];
  const paddedSecond = [...secondValues];

  while (paddedFirst.length < maxLength) paddedFirst.unshift(0);
  while (paddedSecond.length < maxLength) paddedSecond.unshift(0);

  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-4">
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.18em]">
        <span className="inline-flex items-center gap-2 text-accent-blue-light">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-blue-light" />
          {firstLabel}
        </span>
        <span className="inline-flex items-center gap-2 text-accent-green">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
          {secondLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-36 w-full">
        {[0.2, 0.4, 0.6, 0.8].map((step) => (
          <line
            key={step}
            x1="12"
            x2={width - 12}
            y1={height - 12 - (height - 24) * step}
            y2={height - 12 - (height - 24) * step}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        <polyline fill="none" stroke="rgba(47,152,255,0.95)" strokeWidth="3" points={buildLinePoints(paddedFirst, width, height, 12)} />
        <polyline fill="none" stroke="rgba(22,163,74,0.95)" strokeWidth="3" points={buildLinePoints(paddedSecond, width, height, 12)} />
      </svg>
    </div>
  );
}

export function TeamIdentity({
  team,
  href,
  meta,
}: {
  team: Pick<PubgHubTeam, "id" | "name" | "tag" | "logoUrl">;
  href?: string;
  meta?: ReactNode;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{team.name}</p>
        <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">
          {team.tag ? `[${team.tag}]` : "PUBG Team"}
        </p>
      </div>
      {meta ? <div className="ml-auto shrink-0">{meta}</div> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-[18px] border border-white/[0.06] bg-black/15 p-4 transition hover:border-accent-blue/25 hover:bg-accent-blue/5">
      {content}
    </Link>
  );
}

export function PlayerIdentity({
  player,
  href,
  meta,
}: {
  player: Pick<PubgHubPlayer, "id" | "pubgName" | "avatarUrl" | "currentTeamName">;
  href?: string;
  meta?: ReactNode;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{player.pubgName}</p>
        <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">
          {player.currentTeamName ?? "Team TBD"}
        </p>
      </div>
      {meta ? <div className="ml-auto shrink-0">{meta}</div> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-[18px] border border-white/[0.06] bg-black/15 p-4 transition hover:border-accent-blue/25 hover:bg-accent-blue/5">
      {content}
    </Link>
  );
}

export function EventSummaryCard({
  event,
  href,
}: {
  event: PubgHubEvent;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-[24px] border border-white/[0.06] bg-black/15 p-5 transition hover:border-accent-blue/25 hover:bg-accent-blue/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{event.region}</p>
          <h3 className="mt-2 font-display text-xl font-black uppercase text-white">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={event.status} />
          <SyncPill syncStatus={event.syncStatus} />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Dates" value={formatDateRange(event.startDate, event.endDate)} compact />
        <MetricCard label="Teams" value={event.teamCount} tone="blue" compact />
        <MetricCard label="Matches" value={event.matchCount} tone="green" compact />
      </div>
      <p className="mt-4 text-sm leading-7 text-text-muted">
        {event.description?.trim() || "Published PUBG event coverage with standings, player stats, and recent match context."}
      </p>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-accent-blue-light">
        Open event
        <span aria-hidden="true">/</span>
      </div>
    </Link>
  );
}

export function MapStatsTable({
  stats,
  title,
  description,
}: {
  stats: PubgHubMapStat[];
  title?: string;
  description?: string;
}) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      {title ? (
        <div className="border-b border-white/[0.06] px-5 py-4">
          <SectionHeader eyebrow="Map Read" title={title} description={description} />
        </div>
      ) : null}
      {stats.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Map statistics are not available yet"
            description="Map-based statistics will appear once official match results are published."
          />
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>Map</th>
                <th>Matches</th>
                <th>Kills</th>
                <th>Wins</th>
                <th>Avg Place</th>
                <th>Damage</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.map}>
                  <td className="font-semibold text-white">{row.map}</td>
                  <td className="text-right">{formatNumber(row.matches)}</td>
                  <td className="text-right">{formatNumber(row.kills)}</td>
                  <td className="text-right">{formatNumber(row.wins)}</td>
                  <td className="text-right">{formatDecimal(row.avgPlacement, 2)}</td>
                  <td className="text-right">{formatNumber(row.damage)}</td>
                  <td className="points-cell text-right">{formatNumber(row.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RecentMatchCards({
  matches,
  teamLookup,
}: {
  matches: Array<PubgHubRecentMatch | PubgHubMatch>;
  teamLookup?: Map<string, PubgHubTeam>;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="No match results have been published yet"
        description="Results will appear once they are officially verified."
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => {
        const isRecentMatch = "teamName" in match;
        const winnerName = isRecentMatch ? match.teamName : match.winnerTeamName ?? "Winner TBD";
        const winnerLogo = isRecentMatch
          ? teamLookup?.get(match.teamId)?.logoUrl ?? null
          : match.winnerTeamId
            ? teamLookup?.get(match.winnerTeamId)?.logoUrl ?? null
            : null;
        const href = buildHref(`/pubg/events/${match.eventSlug}`, { tab: "matches" });

        return (
          <Link
            key={isRecentMatch ? match.matchId : match.id}
            href={href}
            className="block rounded-[22px] border border-white/[0.06] bg-black/15 p-4 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">
                  {"eventName" in match ? match.eventName : "Match"}
                </p>
                <h3 className="mt-2 font-display text-base font-black uppercase text-white">
                  {match.mapName} | Match {"matchNumber" in match ? match.matchNumber : "-"}
                </h3>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                {formatDate(match.startTime)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <TeamAvatar name={winnerName} imageUrl={winnerLogo ?? undefined} size="sm" />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Winner</p>
                <p className="font-semibold text-white">{winnerName}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricCard label="Place" value={isRecentMatch ? `#${match.placement}` : "Lobby"} compact />
              <MetricCard label="Kills" value={isRecentMatch ? match.kills : match.totalKills} tone="blue" compact />
              <MetricCard
                label="Total"
                value={isRecentMatch ? match.totalPoints : Math.max(...match.teamResults.map((teamResult) => teamResult.totalPoints), 0)}
                tone="green"
                compact
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type RadarPoint = {
  label: string;
  firstValue: number;
  secondValue: number;
};

function buildRadarPolygon(values: number[], radius: number, center: number) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const x = center + Math.cos(angle) * radius * value;
      const y = center + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildAxisLabelStyle(_label: string, x: number, y: number): CSSProperties {
  return {
    left: x,
    top: y,
    transform: "translate(-50%, -50%)",
  };
}

export function RadarComparison({
  title,
  points,
  firstLabel,
  secondLabel,
}: {
  title: string;
  points: RadarPoint[];
  firstLabel: string;
  secondLabel: string;
}) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="Comparison data is not available yet"
        description="Comparison statistics will appear once both sides have enough published match data."
      />
    );
  }

  const size = 240;
  const center = size / 2;
  const radius = 84;
  const maxValue = Math.max(...points.flatMap((point) => [point.firstValue, point.secondValue]), 1);
  const normalizedFirst = points.map((point) => Math.max(0.08, point.firstValue / maxValue));
  const normalizedSecond = points.map((point) => Math.max(0.08, point.secondValue / maxValue));

  return (
    <div className="rounded-[24px] border border-white/[0.06] bg-black/15 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Comparison Lens</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.18em]">
          <span className="inline-flex items-center gap-2 text-accent-blue-light">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-blue-light" />
            {firstLabel}
          </span>
          <span className="inline-flex items-center gap-2 text-accent-green">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
            {secondLabel}
          </span>
        </div>
      </div>
      <div className="relative mt-5 flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-64 w-64">
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <polygon
              key={ratio}
              points={buildRadarPolygon(points.map(() => ratio), radius, center)}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}
          {points.map((_, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / points.length;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;

            return <line key={`axis-${index}`} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
          })}
          <polygon points={buildRadarPolygon(normalizedSecond, radius, center)} fill="rgba(22,163,74,0.14)" stroke="rgba(22,163,74,0.92)" strokeWidth="2.5" />
          <polygon points={buildRadarPolygon(normalizedFirst, radius, center)} fill="rgba(47,152,255,0.14)" stroke="rgba(47,152,255,0.92)" strokeWidth="2.5" />
        </svg>
        {points.map((point, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / points.length;
          const x = center + Math.cos(angle) * (radius + 26);
          const y = center + Math.sin(angle) * (radius + 26);

          return (
            <div
              key={point.label}
              className="absolute text-center text-[10px] font-black uppercase tracking-[0.14em] text-text-muted"
              style={buildAxisLabelStyle(point.label, x, y)}
            >
              {point.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
