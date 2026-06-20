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
  if (!value) return "Date pending";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Time pending";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${dateTimeFormatter.format(parsed)} NPT`;
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "Schedule pending";
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
  return source === "supabase" ? "Supabase live data" : "Launch dataset fallback";
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
      <div>
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm text-text-muted">{description}</p> : null}
      </div>
      {action}
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
    <section className="hero-banner overflow-hidden p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
      <div className="relative z-10 grid gap-8 xl:grid-cols-[1.35fr,0.85fr]">
        <div>
          <span className="brand-badge">{badge}</span>
          <h1 className="hero-h1 mt-5">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">{description}</p>
          {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
          {stats?.length ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} compact />
              ))}
            </div>
          ) : null}
        </div>
        {aside ? <div className="rounded-card border border-white/[0.08] bg-bg-primary/75 p-5">{aside}</div> : null}
      </div>
    </section>
  );
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
  const toneClass =
    tone === "green"
      ? "text-accent-green"
      : tone === "red"
        ? "text-accent-red"
        : tone === "yellow"
          ? "text-accent-yellow"
          : "text-accent-blue";

  return (
    <div className={joinClasses("stat-pill", compact ? "p-4" : "p-5")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={joinClasses("mt-3 font-mono-stat text-2xl", toneClass)}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {detail ? <p className="mt-2 text-xs text-text-muted">{detail}</p> : null}
    </div>
  );
}

function toneClassForStatus(status: PubgHubEventStatus) {
  if (status === "ongoing") {
    return "border-accent-red/30 bg-accent-red/10 text-accent-red";
  }

  if (status === "finished") {
    return "border-accent-green/30 bg-accent-green/10 text-accent-green";
  }

  return "border-accent-blue/30 bg-accent-blue/10 text-accent-blue";
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
  const label = status === "ongoing" ? "Live" : status === "finished" ? "Finished" : "Upcoming";

  return (
    <span className={joinClasses("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", toneClassForStatus(status))}>
      {status === "ongoing" ? <span className="live-dot h-1.5 w-1.5" /> : null}
      {label}
    </span>
  );
}

export function StatePill({ state }: { state: PubgHubEventState }) {
  const label = state === "draft" ? "Draft" : state === "locked" ? "Locked" : "Published";

  return (
    <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", toneClassForState(state))}>
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
          ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
          : "border-white/10 bg-white/5 text-text-muted";

  const label =
    syncStatus === "synced"
      ? "Synced"
      : syncStatus === "awaiting_approval"
        ? "Awaiting Approval"
        : syncStatus === "scheduled"
          ? "Scheduled"
          : "Draft";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

export function FormPill({ label }: { label: string }) {
  const className =
    label === "Surging"
      ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
      : label === "Steady"
        ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
        : label === "Rising"
          ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
          : "border-white/10 bg-white/5 text-text-muted";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

export function RankBadge({ rank }: { rank: number }) {
  const className =
    rank === 1
      ? "bg-accent-yellow/12 text-accent-yellow border-accent-yellow/25"
      : rank <= 3
        ? "bg-accent-blue/12 text-accent-blue border-accent-blue/25"
        : "bg-white/5 text-text-muted border-white/10";

  return <span className={joinClasses("inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1 font-mono-stat text-xs", className)}>#{rank}</span>;
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
    <div className="rounded-card border border-dashed border-white/10 bg-bg-primary/50 p-6 text-center">
      <p className="font-display text-lg font-black uppercase text-white">{title}</p>
      <p className="mt-2 text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function TrendBars({
  values,
  tone = "blue",
  height = 46,
}: {
  values: number[];
  tone?: "blue" | "green" | "red" | "yellow";
  height?: number;
}) {
  if (values.length === 0) {
    return <div className="h-12 rounded-card border border-dashed border-white/10 bg-bg-primary/40" />;
  }

  const maxValue = Math.max(...values, 1);
  const barClass =
    tone === "green"
      ? "from-accent-green/35 to-accent-green"
      : tone === "red"
        ? "from-accent-red/35 to-accent-red"
        : tone === "yellow"
          ? "from-accent-yellow/35 to-accent-yellow"
          : "from-accent-blue/35 to-accent-blue";

  return (
    <div className="flex items-end gap-1">
      {values.map((value, index) => {
        const computedHeight = Math.max(10, Math.round((value / maxValue) * height));

        return (
          <div key={`${index}-${value}`} className="flex-1 rounded-full bg-white/5 p-0.5">
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
    return <EmptyState title="Trend data pending" description="Recent form charts will appear once enough match history is available." />;
  }

  const paddedFirst = [...firstValues];
  const paddedSecond = [...secondValues];

  while (paddedFirst.length < maxLength) paddedFirst.unshift(0);
  while (paddedSecond.length < maxLength) paddedSecond.unshift(0);

  return (
    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.18em]">
        <span className="inline-flex items-center gap-2 text-accent-blue">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-blue" />
          {firstLabel}
        </span>
        <span className="inline-flex items-center gap-2 text-accent-green">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
          {secondLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-36 w-full">
        <defs>
          <linearGradient id="pubgTrendBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(29,155,240,0.2)" />
            <stop offset="100%" stopColor="rgba(29,155,240,1)" />
          </linearGradient>
          <linearGradient id="pubgTrendGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,230,118,0.2)" />
            <stop offset="100%" stopColor="rgba(0,230,118,1)" />
          </linearGradient>
        </defs>
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
        <polyline fill="none" stroke="url(#pubgTrendBlue)" strokeWidth="3" points={buildLinePoints(paddedFirst, width, height, 12)} />
        <polyline fill="none" stroke="url(#pubgTrendGreen)" strokeWidth="3" points={buildLinePoints(paddedSecond, width, height, 12)} />
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
        <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">{team.tag ? `[${team.tag}]` : "PUBG Team"}</p>
      </div>
      {meta ? <div className="ml-auto shrink-0">{meta}</div> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
        <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team pending"}</p>
      </div>
      {meta ? <div className="ml-auto shrink-0">{meta}</div> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
    <Link href={href} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{event.region}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={event.status} />
          <SyncPill syncStatus={event.syncStatus} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Date</p>
          <p className="mt-1 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">State</p>
          <div className="mt-2">
            <StatePill state={event.state} />
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Format</p>
          <p className="mt-1 text-sm text-white">
            {event.mode} {event.perspective}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Teams</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.teamCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Matches</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.matchCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Prize</p>
          <p className="mt-1 text-sm text-white">{event.prizePool}</p>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-blue">
        Open event
        <span aria-hidden="true">&gt;</span>
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
        <div className="border-b border-white/[0.08] px-5 py-4">
          <SectionHeader eyebrow="Map Read" title={title} description={description} />
        </div>
      ) : null}
      {stats.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Map splits pending" description="Map-based output will appear once match-level data is published for this view." />
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
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.map}>
                  <td className="font-semibold text-white">{row.map}</td>
                  <td>{formatNumber(row.matches)}</td>
                  <td>{formatNumber(row.kills)}</td>
                  <td>{formatNumber(row.wins)}</td>
                  <td>{formatDecimal(row.avgPlacement, 2)}</td>
                  <td>{formatNumber(row.damage)}</td>
                  <td className="points-cell">{formatNumber(row.points)}</td>
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
    return <EmptyState title="No match activity yet" description="Recent match cards will appear here once this section has published results." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => {
        const isRecentMatch = "teamName" in match;
        const winnerName = isRecentMatch ? match.teamName : match.winnerTeamName ?? "Winner pending";
        const winnerLogo = isRecentMatch
          ? teamLookup?.get(match.teamId)?.logoUrl ?? null
          : match.winnerTeamId
            ? teamLookup?.get(match.winnerTeamId)?.logoUrl ?? null
            : null;
        const href = `/pubg/matches/${isRecentMatch ? match.matchId : match.id}`;

        return (
          <Link key={isRecentMatch ? match.matchId : match.id} href={href} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                  {"eventName" in match ? match.eventName : "Match"}
                </p>
                <h3 className="mt-2 font-display text-base font-black uppercase text-white">
                  Map {isRecentMatch ? match.mapName : match.mapName} | Match {"matchNumber" in match ? match.matchNumber : "-"}
                </h3>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
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
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Place</p>
                <p className="mt-1 font-mono-stat text-white">{isRecentMatch ? `#${match.placement}` : "Full lobby"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Kills</p>
                <p className="mt-1 font-mono-stat text-white">{formatNumber(isRecentMatch ? match.kills : match.totalKills)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Points</p>
                <p className="mt-1 font-mono-stat text-accent-green">
                  {formatNumber(isRecentMatch ? match.totalPoints : Math.max(...match.teamResults.map((teamResult) => teamResult.totalPoints), 0))}
                </p>
              </div>
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
      const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / values.length;
      const x = center + Math.cos(angle) * radius * value;
      const y = center + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildAxisLabelStyle(label: string, x: number, y: number): CSSProperties {
  return {
    left: x,
    top: y,
    transform: label.length > 8 ? "translate(-50%, -50%)" : "translate(-50%, -50%)",
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
    return <EmptyState title="Comparison data pending" description="Radar signals will appear once both sides have enough tracked stats." />;
  }

  const size = 240;
  const center = size / 2;
  const radius = 84;
  const maxValue = Math.max(...points.flatMap((point) => [point.firstValue, point.secondValue]), 1);
  const normalizedFirst = points.map((point) => Math.max(0.08, point.firstValue / maxValue));
  const normalizedSecond = points.map((point) => Math.max(0.08, point.secondValue / maxValue));

  return (
    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Radar Layer</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span className="inline-flex items-center gap-2 text-accent-blue">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-blue" />
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
            const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / points.length;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;

            return <line key={`axis-${index}`} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
          })}
          <polygon points={buildRadarPolygon(normalizedSecond, radius, center)} fill="rgba(0,230,118,0.14)" stroke="rgba(0,230,118,0.92)" strokeWidth="2.5" />
          <polygon points={buildRadarPolygon(normalizedFirst, radius, center)} fill="rgba(29,155,240,0.14)" stroke="rgba(29,155,240,0.92)" strokeWidth="2.5" />
        </svg>
        {points.map((point, index) => {
          const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / points.length;
          const x = center + Math.cos(angle) * (radius + 26);
          const y = center + Math.sin(angle) * (radius + 26);

          return (
            <div key={point.label} className="absolute text-center text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted" style={buildAxisLabelStyle(point.label, x, y)}>
              {point.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

