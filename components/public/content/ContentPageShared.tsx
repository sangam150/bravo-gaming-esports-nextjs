import {
  buildPublicHref,
  joinClasses,
  readSearchParam,
  type SearchParamDictionary,
} from "@/components/public/PublicDesignSystem";
import {
  BRAVO_DISCORD_URL,
  BRAVO_FACEBOOK_URL,
  BRAVO_INSTAGRAM_URL,
  BRAVO_YOUTUBE_URL,
} from "@/lib/brand-links";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export const UNAVAILABLE = "\u2014";

export function isCompatibilityFallback(id: string) {
  return id.startsWith("public-fallback-");
}

export function normalizePage(value: string | string[] | undefined, totalPages: number) {
  const parsed = Number.parseInt(readSearchParam(value, "1"), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), Math.max(totalPages, 1));
}

export function dateValue(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function meaningfulText(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || /^(tba|tbd|pending|unknown|n\/a|not available|to be announced)$/i.test(normalized)) {
    return UNAVAILABLE;
  }
  return normalized;
}

export function PaginationNav({
  pathname,
  searchParams,
  currentPage,
  totalPages,
}: {
  pathname: string;
  searchParams: SearchParamDictionary;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const candidatePages =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : Array.from(new Set([1, Math.max(2, currentPage - 1), currentPage, Math.min(totalPages - 1, currentPage + 1), totalPages])).sort(
          (first, second) => first - second,
        );

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <Link
        href={buildPublicHref(pathname, searchParams, { page: currentPage > 2 ? currentPage - 1 : null })}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={joinClasses(
          "btn-secondary min-h-10 !px-3 !py-2",
          currentPage === 1 && "pointer-events-none opacity-40",
        )}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </Link>
      {candidatePages.map((pageNumber, index) => {
        const previousNumber = candidatePages[index - 1];
        const showGap = previousNumber !== undefined && pageNumber - previousNumber > 1;
        return (
          <span key={pageNumber} className="flex items-center gap-2">
            {showGap ? <span className="px-1 text-text-muted">&hellip;</span> : null}
            <Link
              href={buildPublicHref(pathname, searchParams, { page: pageNumber === 1 ? null : pageNumber })}
              aria-current={currentPage === pageNumber ? "page" : undefined}
              className={joinClasses(
                "inline-flex h-10 min-w-10 items-center justify-center rounded-[4px] border px-3 text-sm font-semibold transition",
                currentPage === pageNumber
                  ? "border-accent-blue bg-accent-blue text-white"
                  : "border-white/15 bg-black/20 text-text-secondary hover:border-accent-blue/50 hover:text-white",
              )}
            >
              {pageNumber}
            </Link>
          </span>
        );
      })}
      <Link
        href={buildPublicHref(pathname, searchParams, { page: currentPage + 1 })}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={joinClasses(
          "btn-secondary min-h-10 !px-3 !py-2",
          currentPage === totalPages && "pointer-events-none opacity-40",
        )}
      >
        Next
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}

export function FilterTabs({
  pathname,
  searchParams,
  paramName,
  activeValue,
  items,
  label,
}: {
  pathname: string;
  searchParams: SearchParamDictionary;
  paramName: string;
  activeValue: string;
  items: Array<{ label: string; value: string }>;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex min-w-0 flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.value}
          href={buildPublicHref(pathname, searchParams, {
            [paramName]: item.value,
            page: null,
          })}
          aria-current={activeValue === item.value ? "page" : undefined}
          className={joinClasses(
            "inline-flex min-h-10 items-center justify-center rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] transition",
            activeValue === item.value
              ? "border-accent-blue bg-accent-blue text-white shadow-[0_0_22px_rgba(8,102,255,0.22)]"
              : "border-white/15 bg-black/20 text-text-secondary hover:border-accent-blue/50 hover:text-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function ChannelLinks() {
  const channels = [
    { label: "YouTube", href: BRAVO_YOUTUBE_URL, shortLabel: "YT" },
    { label: "Facebook", href: BRAVO_FACEBOOK_URL, shortLabel: "FB" },
    { label: "Instagram", href: BRAVO_INSTAGRAM_URL, shortLabel: "IG" },
    { label: "Discord", href: BRAVO_DISCORD_URL, shortLabel: "DC" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => (
        <a
          key={channel.label}
          href={channel.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${channel.label} (opens in a new tab)`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/20 text-[10px] font-bold text-text-secondary transition hover:border-accent-blue/60 hover:text-white"
        >
          {channel.shortLabel}
        </a>
      ))}
    </div>
  );
}
