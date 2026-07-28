import {
  PublicActionLink,
  PublicBreadcrumbs,
  PublicStatusBadge,
  buildPublicHref,
  joinClasses,
  type SearchParamDictionary,
} from "@/components/public/PublicDesignSystem";
import ManagedImage from "@/components/ui/ManagedImage";
import type { PubgHubDataset, PubgHubMatch } from "@/lib/pubg-hub";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type CompetitionPageProps = {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
  basePath: string;
};

export const DIRECTORY_PAGE_SIZE = 10;
export const BOARD_PREVIEW_SIZE = 10;

export function toPositivePage(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((first, second) =>
    first.localeCompare(second),
  );
}

export function formatResultsTimestamp(value?: string | null) {
  if (!value) return "Awaiting a published match";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Awaiting a published match";

  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(timestamp)} NPT`;
}

export function getLatestMatch(matches: readonly PubgHubMatch[]) {
  return (
    [...matches].sort((first, second) => {
      const firstTime = Date.parse(first.startTime);
      const secondTime = Date.parse(second.startTime);
      if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
        return secondTime - firstTime;
      }
      return second.matchNumber - first.matchNumber;
    })[0] ?? null
  );
}

export function getRecentTeamPlacements(matches: readonly PubgHubMatch[], teamId: string, limit = 5) {
  return [...matches]
    .sort((first, second) => first.startTime.localeCompare(second.startTime))
    .flatMap((match) => {
      const result = match.teamResults.find((row) => row.teamId === teamId);
      return result ? [result.placement] : [];
    })
    .slice(-limit);
}

export function CompetitionHero({
  current,
  title,
  description,
  aside,
}: {
  current: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <section className="public-hero -mx-4 sm:-mx-6 lg:-mx-8">
      <Image
        src="/images/bravo-battleground-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none -z-10 object-cover object-[62%_top] opacity-75"
      />
      <div className="public-container grid min-h-[260px] gap-6 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.38fr)] lg:items-center lg:px-8 lg:py-10">
        <div className="max-w-2xl">
          <PublicBreadcrumbs current={current} />
          <h1 className="public-title mt-4">{title}</h1>
          <p className="public-copy mt-4">{description}</p>
        </div>
        {aside ? <div className="relative z-10 min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}

export function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={joinClasses("grid min-w-0 gap-1.5", className)}>
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function FilterActions({ resetPath }: { resetPath: string }) {
  return (
    <div className="flex items-end gap-2">
      <button type="submit" className="btn-primary min-h-11 flex-1 sm:flex-none">
        Apply
      </button>
      <PublicActionLink href={resetPath} variant="secondary" className="min-h-11 flex-1 sm:flex-none">
        Reset
      </PublicActionLink>
    </div>
  );
}

function buildPaginationItems(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const items: Array<number | "left-gap" | "right-gap"> = [1];
  if (page > 3) items.push("left-gap");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let item = start; item <= end; item += 1) items.push(item);

  if (page < totalPages - 2) items.push("right-gap");
  items.push(totalPages);
  return items;
}

export function PublicPagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: SearchParamDictionary;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          href={buildPublicHref(basePath, searchParams, { page: page - 1 })}
          aria-label="Previous page"
          className="public-pagination-link"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="public-pagination-link cursor-not-allowed opacity-45" aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {buildPaginationItems(page, totalPages).map((item) =>
        typeof item === "number" ? (
          <Link
            key={item}
            href={buildPublicHref(basePath, searchParams, { page: item })}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={joinClasses("public-pagination-link", item === page && "public-pagination-active")}
          >
            {item}
          </Link>
        ) : (
          <span key={item} className="inline-flex h-9 min-w-7 items-center justify-center text-text-muted" aria-hidden="true">
            …
          </span>
        ),
      )}

      {page < totalPages ? (
        <Link href={buildPublicHref(basePath, searchParams, { page: page + 1 })} aria-label="Next page" className="public-pagination-link">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="public-pagination-link cursor-not-allowed opacity-45" aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

export function LargeIdentityArtwork({
  name,
  imageUrl,
  label,
  imageFit = "cover",
}: {
  name: string;
  imageUrl?: string | null;
  label: string;
  imageFit?: "cover" | "contain";
}) {
  const initials = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative flex min-h-[270px] items-center justify-center overflow-hidden rounded-[5px] border border-accent-blue/40 bg-[radial-gradient(circle_at_50%_32%,rgba(47,140,255,0.28),transparent_38%),linear-gradient(180deg,#081b34,#030a13)] p-8">
      <span className="absolute left-3 top-3 z-10 rounded-[3px] bg-accent-blue px-2.5 py-1.5 font-display text-xs font-bold uppercase text-white">
        {label}
      </span>
      {imageUrl ? (
        <ManagedImage
          src={imageUrl}
          alt={name}
          sizes="320px"
          wrapperClassName="absolute inset-0 h-full w-full"
          className={imageFit === "contain" ? "object-contain p-8" : "object-cover"}
        />
      ) : (
        <span
          className="inline-flex h-32 w-32 items-center justify-center rounded-full border border-accent-blue/45 bg-accent-blue/15 font-display text-5xl font-extrabold text-white shadow-[0_0_55px_rgba(11,108,255,0.24)]"
          aria-label={`${name} initials`}
        >
          {initials || "BG"}
        </span>
      )}
    </div>
  );
}

export function PlacementStrip({ placements, emptyLabel = "Form pending" }: { placements: number[]; emptyLabel?: string }) {
  if (placements.length === 0) return <span className="text-xs text-text-muted">{emptyLabel}</span>;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Recent placements">
      {placements.map((placement, index) => (
        <PublicStatusBadge key={`${placement}-${index}`} tone={placement === 1 ? "green" : placement <= 3 ? "blue" : "neutral"}>
          {placement === 1 ? "WWCD" : `#${placement}`}
        </PublicStatusBadge>
      ))}
    </div>
  );
}

export function OutputStrip({ values }: { values: number[] }) {
  if (values.length === 0) return <span className="text-xs text-text-muted">Output pending</span>;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Recent kill output">
      {values.slice(-5).map((value, index) => (
        <PublicStatusBadge key={`${value}-${index}`} tone={value > 0 ? "blue" : "neutral"}>
          {value}K
        </PublicStatusBadge>
      ))}
    </div>
  );
}
