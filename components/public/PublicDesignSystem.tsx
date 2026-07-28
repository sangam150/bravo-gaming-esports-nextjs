import ManagedImage from "@/components/ui/ManagedImage";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PlatformSponsorProfile } from "@/lib/platform-hub";
import { normalizePublicActionHref } from "@/lib/public-links";
import { resolveSponsorDestination, sponsorOpensInNewTab } from "@/lib/sponsor-links";
import { ArrowRight, ExternalLink, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type SearchParamDictionary = Record<string, string | string[] | undefined>;

export function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function readSearchParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

export function buildPublicHref(
  pathname: string,
  current: SearchParamDictionary,
  updates: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const resolved = readSearchParam(value);
    if (resolved) params.set(key, resolved);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function formatPublicNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}

export function formatPublicDate(value?: string | null) {
  if (!value) return "Schedule pending";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Schedule pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

export function formatPublicDateRange(start?: string | null, end?: string | null) {
  if (!start) return "Schedule pending";
  if (!end || start === end) return formatPublicDate(start);
  return `${formatPublicDate(start)} – ${formatPublicDate(end)}`;
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function PublicActionLink({
  href,
  children,
  variant = "primary",
  className,
  externalLabel,
  openInNewTab = true,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "discord";
  className?: string;
  externalLabel?: string;
  openInNewTab?: boolean;
}) {
  const variantClass =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "ghost"
        ? "btn-outline-blue"
        : variant === "discord"
          ? "btn-discord"
          : "btn-primary";
  const resolvedClassName = joinClasses(variantClass, className);
  const resolvedHref = normalizePublicActionHref(href);
  if (!resolvedHref) {
    return null;
  }

  if (isExternalHref(resolvedHref)) {
    return (
      <a
        href={resolvedHref}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className={resolvedClassName}
      >
        {children}
        {externalLabel ? <span className="sr-only">{externalLabel}</span> : null}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={resolvedHref} className={resolvedClassName}>
      {children}
    </Link>
  );
}

export function PublicBreadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="public-eyebrow flex items-center gap-2">
      <Link href="/" className="transition hover:text-white">
        Home
      </Link>
      <span aria-hidden="true" className="text-text-muted">
        /
      </span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function PublicPageHero({
  breadcrumbCurrent,
  eyebrow,
  title,
  description,
  imageUrl,
  actions,
  aside,
  className,
  children,
}: {
  breadcrumbCurrent?: string;
  eyebrow?: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={joinClasses("public-hero -mx-4 sm:-mx-6 lg:-mx-8", className)}>
      <div className="absolute inset-0 -z-10">
        {imageUrl ? (
          <ManagedImage
            src={imageUrl}
            alt=""
            priority
            sizes="100vw"
            wrapperClassName="h-full w-full"
            className="object-cover object-center opacity-55"
          />
        ) : (
          <Image
            src="/images/bravo-battleground-hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_top] opacity-75"
          />
        )}
      </div>
      <div className="public-container grid min-h-[260px] gap-6 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.42fr)] lg:items-center lg:px-8 lg:py-10">
        <div className="max-w-3xl">
          {breadcrumbCurrent ? <PublicBreadcrumbs current={breadcrumbCurrent} /> : null}
          {eyebrow ? <p className={joinClasses("public-eyebrow", breadcrumbCurrent && "mt-3")}>{eyebrow}</p> : null}
          <h1 className="public-title mt-3">{title}</h1>
          <p className="public-copy mt-4">{description}</p>
          {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
        {aside ? <div className="relative z-10 min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}

export function PublicSectionHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClasses("flex min-w-0 flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="public-kicker mb-2">{eyebrow}</p> : null}
        <h2 className="public-section-heading">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PublicMetric({
  label,
  value,
  icon,
  detail,
  className,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={joinClasses("public-card flex min-h-[84px] items-center gap-3 p-4", className)}>
      {icon ? (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] border border-accent-blue/20 bg-accent-blue/10 text-accent-blue-light">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="public-stat-value truncate">{value}</p>
        <p className="public-stat-label">{label}</p>
        {detail ? <p className="mt-1 text-[10px] text-text-muted">{detail}</p> : null}
      </div>
    </div>
  );
}

export function PublicStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "neutral";
  className?: string;
}) {
  const toneClass = {
    blue: "border-accent-blue/40 bg-accent-blue/15 text-accent-blue-light",
    green: "border-accent-green/35 bg-accent-green/10 text-accent-green",
    amber: "border-accent-yellow/35 bg-accent-yellow/10 text-accent-yellow",
    red: "border-accent-red/35 bg-accent-red/10 text-accent-red",
    purple: "border-purple-500/35 bg-purple-500/10 text-purple-300",
    neutral: "border-white/15 bg-white/[0.04] text-text-secondary",
  }[tone];

  return <span className={joinClasses("public-badge", toneClass, className)}>{children}</span>;
}

export function PublicEmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={joinClasses("public-empty", compact && "min-h-28 py-5")}>
      <p className="font-display text-lg font-bold text-white">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PublicCommunityCta({
  title = "Be part of Nepal’s PUBG PC esports community",
  description = "Join the official Bravo community for competition updates, team discovery, and published event announcements.",
  showRegister = true,
}: {
  title?: string;
  description?: string;
  showRegister?: boolean;
}) {
  return (
    <section className="public-cta">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-accent-blue-light sm:inline-flex">
            <Users className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold uppercase leading-none text-white">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <PublicActionLink href={BRAVO_DISCORD_URL} variant="discord">
            Join Discord
          </PublicActionLink>
          {showRegister ? (
            <PublicActionLink href="/teams/register" variant="secondary">
              Register Team
            </PublicActionLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function sponsorVisualUrl(sponsor: PlatformSponsorProfile) {
  return sponsor.logoUrl ?? sponsor.designAssetUrl ?? sponsor.bannerUrl ?? null;
}

export function PublicPartnerStrip({ sponsors }: { sponsors: PlatformSponsorProfile[] }) {
  const visibleSponsors = sponsors
    .filter((sponsor) => sponsor.visible)
    .filter((sponsor, index, values) => values.findIndex((value) => value.id === sponsor.id) === index);

  return (
    <section className="public-panel px-4 py-3.5">
      <p className="text-center font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        Official Partners
      </p>
      {visibleSponsors.length > 0 ? (
        <div
          className={joinClasses(
            "mt-3 grid items-center gap-3",
            visibleSponsors.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
          )}
        >
          {visibleSponsors.slice(0, 6).map((sponsor) => {
            const visualUrl = sponsorVisualUrl(sponsor);
            const destination = resolveSponsorDestination(sponsor);
            const openInNewTab = sponsorOpensInNewTab(sponsor);
            const visual = visualUrl ? (
              <ManagedImage
                src={visualUrl}
                alt={sponsor.name}
                sizes={sponsor.slug === "hukut" ? "512px" : "180px"}
                wrapperClassName={sponsor.slug === "hukut" ? "h-10 w-60 max-w-full" : "h-10 w-full"}
                className={joinClasses(
                  "object-contain grayscale opacity-80 transition hover:grayscale-0 hover:opacity-100",
                  sponsor.slug === "hukut" && "translate-y-0.5 scale-[3.75]",
                )}
              />
            ) : (
              <span className="truncate">{sponsor.name}</span>
            );

            return destination ? (
              <a
                key={sponsor.id}
                href={destination}
                target={openInNewTab ? "_blank" : undefined}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                aria-label={`Visit ${sponsor.name} website${openInNewTab ? " (opens in a new tab)" : ""}`}
                className="flex min-h-12 items-center justify-center px-3 text-center font-display text-lg font-bold text-white/80 transition hover:text-white"
              >
                {visual}
              </a>
            ) : (
              <div
                key={sponsor.id}
                className="flex min-h-12 items-center justify-center px-3 text-center font-display text-lg font-bold text-white/80"
              >
                {visual}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-center text-sm text-text-muted">Published partner profiles will appear here after approval.</p>
      )}
    </section>
  );
}

export function PublicInlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-blue-light transition hover:text-white">
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
