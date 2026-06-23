"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEventHandler } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Clapperboard,
  Camera,
  FileText,
  Gamepad2,
  Handshake,
  House,
  Info,
  LogIn,
  Menu,
  MessageSquare,
  MonitorPlay,
  Search,
  Trophy,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";

type HeaderFeatureCard = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: "blue" | "red" | "yellow";
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  activePrefixes: string[];
  description?: string;
};

const PRIMARY_LINKS: NavItem[] = [
  { label: "Home", href: "/", icon: House, activePrefixes: ["/"], description: "Bravo homepage and latest public highlights." },
  { label: "PUBG", href: "/pubg", icon: Gamepad2, activePrefixes: ["/pubg"], description: "Flagship PUBG hub with standings, events, results, and profiles." },
  { label: "Events", href: "/events", icon: Trophy, activePrefixes: ["/events"], description: "Published and upcoming public event coverage." },
  {
    label: "Community",
    href: "/pubg/community",
    icon: Users,
    activePrefixes: ["/pubg/community", "/community"],
    description: "Combined community route for teams, players, and announcements.",
  },
  { label: "Media", href: "/media", icon: Clapperboard, activePrefixes: ["/media", "/videos", "/highlights"], description: "Video, highlights, clips, and media coverage." },
  { label: "News", href: "/news", icon: FileText, activePrefixes: ["/news"], description: "Announcements, updates, and editorial coverage." },
  { label: "Sponsors", href: "/sponsors", icon: Handshake, activePrefixes: ["/sponsors", "/partners"], description: "Sponsor and partner profiles." },
  {
    label: "About",
    href: "/about",
    icon: Info,
    activePrefixes: ["/about", "/contact", "/privacy", "/terms"],
    description: "Platform story, mission, and public information.",
  },
];

const PUBG_QUICK_LINKS: NavItem[] = [
  { label: "Leaderboards", href: "/pubg/leaderboards", icon: BarChart3, activePrefixes: ["/pubg/leaderboards"], description: "Team and player boards from published results." },
  { label: "Teams", href: "/pubg/teams", icon: Users, activePrefixes: ["/pubg/teams", "/teams"], description: "Browse current Bravo PUBG team cards and profiles." },
  { label: "Players", href: "/pubg/players", icon: UserRound, activePrefixes: ["/pubg/players", "/players"], description: "Track player output, form, and recent match history." },
  { label: "Results", href: "/pubg/results", icon: Trophy, activePrefixes: ["/pubg/results"], description: "Recent match activity and verified result flow." },
];

const ACTION_LINKS: NavItem[] = [
  { label: "Search", href: "/search", icon: Search, activePrefixes: ["/search"], description: "Search the public Bravo site." },
  { label: "Watch Live", href: "/live-stream", icon: MonitorPlay, activePrefixes: ["/live-stream"], description: "Open the current broadcast or live feed." },
  { label: "Login", href: "/login", icon: LogIn, activePrefixes: ["/login", "/admin", "/team", "/player"], description: "Choose the right Bravo login path." },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: BRAVO_INSTAGRAM_URL,
    description: "Official posters, clips, and public launch updates.",
    icon: Camera,
  },
  {
    label: "Discord",
    href: BRAVO_DISCORD_URL,
    description: "Official community hub for scrims, support, and announcements.",
    icon: MessageSquare,
  },
] as const;

function isExternalLink(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function isPrefixMatch(pathname: string, prefix: string) {
  if (prefix === "/") {
    return pathname === "/";
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAnyPrefixActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
}

function topLinkClasses(active: boolean) {
  if (active) {
    return "border-white/12 bg-white/[0.08] text-white shadow-[0_18px_44px_rgba(0,0,0,0.2)]";
  }

  return "border-transparent text-text-muted hover:border-white/10 hover:bg-white/[0.05] hover:text-white";
}

function utilityLinkClasses(active: boolean, tone: "default" | "live") {
  if (tone === "live") {
    return active
      ? "border-accent-red/50 bg-accent-red/18 text-white"
      : "border-accent-red/30 bg-accent-red/12 text-white hover:border-accent-red/50 hover:bg-accent-red/18";
  }

  return active
    ? "border-accent-blue/30 bg-accent-blue/10 text-white"
    : "border-white/10 bg-white/[0.04] text-text-muted hover:border-white/15 hover:bg-white/[0.08] hover:text-white";
}

function renderNavItemContent(item: NavItem, active: boolean) {
  const Icon = item.icon;

  return (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
      <span>{item.label}</span>
    </>
  );
}

function DesktopNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = !isExternalLink(item.href) && isAnyPrefixActive(pathname, item.activePrefixes);

  if (isExternalLink(item.href)) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(active)}`}
      >
        {renderNavItemContent(item, active)}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(active)}`}
    >
      {renderNavItemContent(item, active)}
    </Link>
  );
}

function DesktopActionLink({
  item,
  pathname,
  href,
}: {
  item: NavItem;
  pathname: string;
  href?: string;
}) {
  const resolvedHref = href ?? item.href;
  const active = !isExternalLink(resolvedHref) && isAnyPrefixActive(pathname, item.activePrefixes);
  const tone = item.label === "Watch Live" ? "live" : "default";
  const Icon = item.icon;

  if (isExternalLink(resolvedHref)) {
    return (
      <a
        href={resolvedHref}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-[16px] border px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] transition ${utilityLinkClasses(active, tone)}`}
      >
        {item.label === "Watch Live" ? <span className="live-dot h-1.5 w-1.5" /> : <Icon className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />}
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <Link
      href={resolvedHref}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-[16px] border px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] transition ${utilityLinkClasses(active, tone)}`}
    >
      {item.label === "Watch Live" ? <span className="live-dot h-1.5 w-1.5" /> : <Icon className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />}
      <span>{item.label}</span>
    </Link>
  );
}

function SocialIconLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-text-muted transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </a>
  );
}

function MobileSection({
  title,
  items,
  pathname,
  onNavigate,
  hrefOverrides,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate: MouseEventHandler<HTMLAnchorElement>;
  hrefOverrides?: Partial<Record<string, string>>;
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex items-center gap-3">
        <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">{title}</p>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid gap-2">
        {items.map((item) => {
          const resolvedHref = hrefOverrides?.[item.label] ?? item.href;
          const active = !isExternalLink(resolvedHref) && isAnyPrefixActive(pathname, item.activePrefixes);
          const Icon = item.icon;
          const content = (
            <>
              <span
                className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border ${
                  active
                    ? "border-accent-blue/25 bg-accent-blue/12 text-accent-blue"
                    : "border-white/10 bg-black/20 text-text-muted group-hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-white">{item.label}</span>
                {item.description ? <span className="mt-1 block text-sm leading-6 text-text-muted">{item.description}</span> : null}
              </span>
            </>
          );

          if (isExternalLink(resolvedHref)) {
            return (
              <a
                key={item.label}
                href={resolvedHref}
                target="_blank"
                rel="noreferrer"
                onClick={onNavigate}
                className={`group flex items-start gap-3 rounded-[20px] border px-3.5 py-3.5 transition ${
                  active
                    ? "border-accent-blue/25 bg-accent-blue/10 text-white"
                    : "border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={resolvedHref}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex items-start gap-3 rounded-[20px] border px-3.5 py-3.5 transition ${
                active
                  ? "border-accent-blue/25 bg-accent-blue/10 text-white"
                  : "border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

type SiteHeaderClientProps = {
  featuredEventCard: HeaderFeatureCard;
  currentSeasonCard: HeaderFeatureCard;
  topTeamCard: HeaderFeatureCard;
  watchLiveHref: string;
};

export default function SiteHeaderClient({ watchLiveHref }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const closeMobileNavigation = () => setMobileOpen(false);
  const closeMobileOnClick: MouseEventHandler<HTMLAnchorElement> = () => closeMobileNavigation();
  const watchLiveItem = ACTION_LINKS.find((item) => item.label === "Watch Live") ?? ACTION_LINKS[1];

  const mobileDrawer =
    mounted && mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-[90] xl:hidden">
            <button type="button" aria-label="Close navigation overlay" onClick={closeMobileNavigation} className="absolute inset-0 bg-black/72 backdrop-blur-sm" />
            <aside className="absolute inset-y-0 right-0 h-full w-full max-w-[30rem] overflow-y-auto overflow-x-hidden border-l border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,11,20,0.98),rgba(5,9,16,0.98))] shadow-[-24px_0_70px_rgba(0,0,0,0.38)]">
              <div className="flex min-h-full flex-col px-4 py-4 sm:px-5">
                <div className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(0,198,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,106,0,0.16),transparent_28%),rgba(10,14,22,0.96)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">Bravo Navigation</p>
                      <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Home, PUBG, events, and live access</h2>
                      <p className="mt-3 text-sm leading-6 text-text-muted">Jump into live coverage, community channels, and the flagship PUBG hub from one clean mobile menu.</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close navigation"
                      onClick={closeMobileNavigation}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/20 text-white transition hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SOCIAL_LINKS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={closeMobileOnClick}
                        className="group rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)] transition hover:border-white/12 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/20 text-text-muted transition group-hover:text-white">
                            <Icon className="h-4 w-4" strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-white">{item.label}</span>
                            <span className="mt-1 block text-sm leading-6 text-text-muted">{item.description}</span>
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4">
                  <MobileSection title="Primary" items={PRIMARY_LINKS} pathname={pathname} onNavigate={closeMobileOnClick} />
                  <MobileSection title="Inside PUBG" items={PUBG_QUICK_LINKS} pathname={pathname} onNavigate={closeMobileOnClick} />
                  <MobileSection
                    title="Actions"
                    items={ACTION_LINKS}
                    pathname={pathname}
                    onNavigate={closeMobileOnClick}
                    hrefOverrides={{ "Watch Live": watchLiveHref || watchLiveItem.href }}
                  />
                </div>
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,11,20,0.96),rgba(7,11,20,0.9))] shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="page-inner relative flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 xl:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <BravoLogo size={46} />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-[15px] font-black uppercase tracking-[0.16em] text-white">Bravo Gaming</p>
              <p className="truncate font-display text-[11px] uppercase tracking-[0.22em] text-text-muted">Esports Nepal</p>
            </div>
          </Link>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/15 hover:bg-white/[0.08] xl:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" strokeWidth={2} /> : <Menu className="h-4 w-4" strokeWidth={2} />}
            {mobileOpen ? "Close" : "Menu"}
          </button>

          <nav className="hidden flex-1 items-center justify-between gap-6 xl:flex">
            <div className="flex flex-wrap items-center gap-2">
              {PRIMARY_LINKS.map((item) => (
                <DesktopNavLink key={item.label} item={item} pathname={pathname} />
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {ACTION_LINKS.map((item) => (
                <DesktopActionLink key={item.label} item={item} pathname={pathname} href={item.label === "Watch Live" ? watchLiveHref : undefined} />
              ))}
              <div className="h-6 w-px bg-white/10" />
              {SOCIAL_LINKS.map((item) => (
                <SocialIconLink key={item.label} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </div>
          </nav>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
