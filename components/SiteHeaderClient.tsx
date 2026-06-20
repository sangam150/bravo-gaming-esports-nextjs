"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Crown,
  FileText,
  Flame,
  Gamepad2,
  Handshake,
  House,
  LifeBuoy,
  LockKeyhole,
  LogIn,
  Menu,
  MonitorPlay,
  Search,
  ScrollText,
  Shield,
  Trophy,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";

type HeaderFeatureCard = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: "blue" | "red" | "yellow";
};

type MenuKey = "pubg" | "events" | "media" | "about" | "login" | null;
type MobilePanel = "main" | "pubg";

type NavEntry = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

type TopLevelLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  activePrefixes: string[];
};

type MobileSection = {
  title: string;
  items: NavEntry[];
};

const DISCORD_HREF = "https://kamaucha.me/bravo";

const PRIMARY_LINKS: TopLevelLink[] = [{ label: "Home", href: "/", icon: House, activePrefixes: ["/"] }];

const EVENT_ITEMS: NavEntry[] = [
  {
    label: "Events Hub",
    href: "/events",
    description: "Published events, invitationals, and detail pages for the wider Bravo ecosystem.",
    icon: Trophy,
  },
  {
    label: "Tournaments",
    href: "/tournaments",
    description: "Open tournament brackets, standings, and the main competition archive.",
    icon: Crown,
  },
  {
    label: "Current Season",
    href: "/pubg/seasons/current",
    description: "Track the active season, current day flow, and published progression.",
    icon: CalendarDays,
  },
  {
    label: "Daily Scrims",
    href: "/pubg-scrims",
    description: "Jump into the daily scrim lane that powers the flagship competitive rhythm.",
    icon: Flame,
  },
  {
    label: "Calendar",
    href: "/calendar",
    description: "See upcoming competition windows, broadcasts, and immediate schedule context.",
    icon: CalendarDays,
  },
];

const MEDIA_ITEMS: NavEntry[] = [
  {
    label: "Media Hub",
    href: "/media",
    description: "The full content center for videos, posters, galleries, and published VODs.",
    icon: Clapperboard,
  },
  {
    label: "Videos",
    href: "/videos",
    description: "Long-form video publishing, archived streams, and match-day coverage.",
    icon: MonitorPlay,
  },
  {
    label: "Highlights",
    href: "/highlights",
    description: "Short-form clips, fast recaps, and momentum pieces from recent competition.",
    icon: Flame,
  },
  {
    label: "News",
    href: "/news",
    description: "Stories, announcements, and platform coverage that keep the scene feeling alive.",
    icon: FileText,
  },
  {
    label: "Community Highlights",
    href: "/community/highlights",
    description: "Fan-facing moments, ecosystem spotlight content, and community-first publishing.",
    icon: Users,
  },
];

const PUBG_COMPETITIVE: NavEntry[] = [
  {
    label: "Leaderboards",
    href: "/pubg/leaderboards",
    description: "Live team and player boards built directly from published match rows.",
    icon: BarChart3,
  },
  {
    label: "Teams",
    href: "/pubg/teams",
    description: "Open the flagship team directory with rosters, form, and profile context.",
    icon: Shield,
  },
  {
    label: "Players",
    href: "/pubg/players",
    description: "Player profiles, recent output, and public scouting lanes.",
    icon: UserRound,
  },
  {
    label: "Rankings",
    href: "/rankings?view=teams&timeframe=seasonal",
    description: "Platform-wide ranking model with the PUBG flagship board at the core.",
    icon: Trophy,
  },
  {
    label: "Hall of Fame",
    href: "/pubg/hall-of-fame",
    description: "Season champions, legacy winners, and Bravo history surfaces.",
    icon: Crown,
  },
  {
    label: "Compare",
    href: "/pubg/compare",
    description: "Head-to-head team and player comparison without leaving the PUBG lane.",
    icon: Flame,
  },
];

const PUBG_LIVE_AND_SCHEDULED: NavEntry[] = [
  {
    label: "Seasons",
    href: "/pubg/seasons/current",
    description: "Active season progress, day-by-day tournament flow, and public standings.",
    icon: CalendarDays,
  },
  {
    label: "Daily Scrims",
    href: "/pubg-scrims",
    description: "Daily scrim-day records, published day results, and current lobby pulse.",
    icon: Flame,
  },
  {
    label: "Tournaments",
    href: "/tournaments",
    description: "Tournament archive and active season-linked competition records.",
    icon: Trophy,
  },
  {
    label: "Events",
    href: "/pubg/events",
    description: "PUBG event boards with schedule, standings, and spotlight context.",
    icon: Gamepad2,
  },
  {
    label: "Matches",
    href: "/pubg/results",
    description: "Universal match center with PUBG as the deepest live surface today.",
    icon: MonitorPlay,
  },
  {
    label: "Calendar",
    href: "/calendar",
    description: "Competition windows, upcoming broadcasts, and next event timing.",
    icon: CalendarDays,
  },
];

const PUBG_RECORDS_AND_STATS: NavEntry[] = [
  {
    label: "Team Records",
    href: "/teams?sort=points",
    description: "Sort the public team database around points, kills, and match totals.",
    icon: Shield,
  },
  {
    label: "Player Records",
    href: "/players?sort=damage",
    description: "Jump straight into the highest-output player surfaces and stat leaders.",
    icon: UserRound,
  },
  {
    label: "Match Records",
    href: "/pubg/results",
    description: "Result feed, match-by-match context, and published scoreboard history.",
    icon: MonitorPlay,
  },
  {
    label: "Season Records",
    href: "/pubg/seasons/current",
    description: "Season-wide progression, day counts, and leaderboard continuity.",
    icon: CalendarDays,
  },
  {
    label: "All-Time Rankings",
    href: "/rankings?view=teams&timeframe=all-time",
    description: "Open the long-term ranking lens without digging through filters first.",
    icon: Crown,
  },
  {
    label: "Statistics",
    href: "/statistics",
    description: "Team standings, player standings, MVP tables, and top-fragger views.",
    icon: FileText,
  },
];

const ABOUT_ITEMS: NavEntry[] = [
  {
    label: "About",
    href: "/about",
    description: "The public platform story, positioning, and Bravo mission.",
    icon: House,
  },
  {
    label: "Sponsors & Partners",
    href: "/sponsors",
    description: "Published sponsor, partner, and design collaborator profiles.",
    icon: Handshake,
  },
  {
    label: "Contact",
    href: "/contact",
    description: "Reach Bravo for tournament, platform, sponsor, or community inquiries.",
    icon: Users,
  },
  {
    label: "Privacy Policy",
    href: "/privacy",
    description: "Platform privacy, data use, and public publishing expectations.",
    icon: Shield,
  },
  {
    label: "Terms & Conditions",
    href: "/terms",
    description: "Rules, participation expectations, and public platform terms.",
    icon: ScrollText,
  },
  {
    label: "Support",
    href: "/feedback",
    description: "Feedback, issue reporting, and support-style follow-up lanes.",
    icon: LifeBuoy,
  },
];

const LOGIN_ITEMS: NavEntry[] = [
  {
    label: "Admin Login",
    href: "/admin",
    description: "Publishing, approvals, schedules, assets, and operational control.",
    icon: LockKeyhole,
  },
  {
    label: "Team Login",
    href: "/team",
    description: "IGL workspace for team documents, requests, and controlled uploads.",
    icon: LogIn,
  },
  {
    label: "Player Login",
    href: "/login",
    description: "Future-ready player access hub and broader role expansion lane.",
    icon: UserRound,
    badge: "Future",
  },
];

const MOBILE_MAIN_SECTIONS: MobileSection[] = [
  {
    title: "About Us",
    items: [
      {
        label: "About",
        href: "/about",
        description: "Platform story and public positioning.",
        icon: House,
      },
      {
        label: "Sponsors",
        href: "/sponsors",
        description: "Partners, design collaborators, and sponsor profiles.",
        icon: Handshake,
      },
      {
        label: "Contact",
        href: "/contact",
        description: "Reach the Bravo team directly.",
        icon: Users,
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        label: "Privacy",
        href: "/privacy",
        description: "How platform data and publishing are handled.",
        icon: Shield,
      },
      {
        label: "Terms",
        href: "/terms",
        description: "Platform terms and participation expectations.",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Access",
    items: LOGIN_ITEMS,
  },
];

const MOBILE_PUBG_SECTIONS: MobileSection[] = [
  {
    title: "Competitive",
    items: PUBG_COMPETITIVE,
  },
  {
    title: "Live & Scheduled",
    items: PUBG_LIVE_AND_SCHEDULED,
  },
  {
    title: "Records & Statistics",
    items: [
      ...PUBG_RECORDS_AND_STATS.filter((item) => item.label !== "Statistics"),
      {
        label: "Statistics",
        href: "/statistics",
        description: "Performance dashboards for teams, players, and MVP leaders.",
        icon: FileText,
      },
    ],
  },
];

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

function topLinkClasses(active: boolean, open = false) {
  if (active || open) {
    return "border-white/12 bg-white/[0.08] text-white shadow-[0_18px_44px_rgba(0,0,0,0.2)]";
  }

  return "border-transparent text-text-muted hover:border-white/10 hover:bg-white/[0.05] hover:text-white";
}

function menuPanelClasses(width: string) {
  return `absolute top-[calc(100%+16px)] z-50 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.98),rgba(6,10,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl ${width}`;
}

function DesktopNavLink({
  item,
  pathname,
}: {
  item: TopLevelLink;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = isAnyPrefixActive(pathname, item.activePrefixes);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(active)}`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
      <span>{item.label}</span>
    </Link>
  );
}

function DesktopMenuLink({ item }: { item: NavEntry }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 rounded-[20px] border border-transparent px-3 py-3 transition hover:border-white/10 hover:bg-white/[0.05]"
    >
      <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-accent-blue transition group-hover:border-accent-blue/25 group-hover:bg-accent-blue/10">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-white">
            {item.label}
          </span>
          {item.badge ? (
            <span className="rounded-full border border-accent-yellow/25 bg-accent-yellow/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-yellow">
              {item.badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-6 text-text-muted">{item.description}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition group-hover:text-white" strokeWidth={2} />
    </Link>
  );
}

function DesktopMenuColumn({
  title,
  items,
}: {
  title: string;
  items: NavEntry[];
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-3 px-2 py-2">
        <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">
          {title}
        </p>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid gap-1">
        {items.map((item) => (
          <DesktopMenuLink key={`${title}-${item.label}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function DesktopDropdownPanel({
  id,
  title,
  items,
  layoutClassName,
}: {
  id: string;
  title: string;
  items: NavEntry[];
  layoutClassName: string;
}) {
  return (
    <div id={id} role="dialog" className={`${menuPanelClasses(layoutClassName)} p-3`}>
      <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-2">
        <div className="mb-2 flex items-center gap-3 px-3 py-2">
          <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">
            {title}
          </p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        {items.map((item) => (
          <DesktopMenuLink key={`${title}-${item.label}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  card,
  icon: Icon,
}: {
  card: HeaderFeatureCard;
  icon: LucideIcon;
}) {
  const toneClasses =
    card.tone === "red"
      ? "from-accent-red/18 via-accent-red/4 to-transparent text-accent-red"
      : card.tone === "yellow"
        ? "from-accent-yellow/18 via-accent-yellow/4 to-transparent text-accent-yellow"
        : "from-accent-blue/18 via-accent-blue/4 to-transparent text-accent-blue";

  return (
    <Link
      href={card.href}
      className="group rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 transition hover:border-white/12 hover:bg-white/[0.06]"
    >
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-gradient-to-br ${toneClasses}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
            {card.eyebrow}
          </p>
          <p className="mt-1 font-display text-lg font-black uppercase leading-tight text-white">
            {card.title}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-muted">{card.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/72">
          {card.meta}
        </p>
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          {card.actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}

function MobileNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavEntry;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isPrefixMatch(pathname, item.href.split("?")[0] || item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex items-start gap-3 rounded-[20px] border px-3.5 py-3.5 transition ${
        active
          ? "border-accent-blue/25 bg-accent-blue/10 text-white"
          : "border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
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
        <span className="flex items-center gap-2">
          <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-white">
            {item.label}
          </span>
          {item.badge ? (
            <span className="rounded-full border border-accent-yellow/25 bg-accent-yellow/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-yellow">
              {item.badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-6 text-text-muted">{item.description}</span>
      </span>
    </Link>
  );
}

function MobileSectionBlock({
  section,
  pathname,
  onNavigate,
}: {
  section: MobileSection;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex items-center gap-3">
        <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">
          {section.title}
        </p>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid gap-2">
        {section.items.map((item) => (
          <MobileNavLink key={`${section.title}-${item.label}`} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function MobilePubgButton({
  onOpen,
  active,
}: {
  onOpen: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex w-full items-start gap-3 rounded-[20px] border px-3.5 py-3.5 text-left transition ${
        active
          ? "border-accent-yellow/25 bg-accent-yellow/10 text-white"
          : "border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border ${
          active
            ? "border-accent-yellow/25 bg-accent-yellow/12 text-accent-yellow"
            : "border-white/10 bg-black/20 text-text-muted group-hover:text-white"
        }`}
      >
        <Gamepad2 className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-white">
          PUBG
        </span>
        <span className="mt-1 block text-sm leading-6 text-text-muted">
          Open the flagship competitive, schedule, and records panel.
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition group-hover:text-white" strokeWidth={2} />
    </button>
  );
}

function ActionLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (isExternalLink(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export default function SiteHeaderClient({
  featuredEventCard,
  currentSeasonCard,
  topTeamCard,
  watchLiveHref,
}: {
  featuredEventCard: HeaderFeatureCard;
  currentSeasonCard: HeaderFeatureCard;
  topTeamCard: HeaderFeatureCard;
  watchLiveHref: string;
}) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [desktopMenu, setDesktopMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("main");

  const pubgActive = isAnyPrefixActive(pathname, [
    "/pubg",
    "/leaderboard",
    "/current-season",
    "/tournaments",
    "/matches",
    "/results",
    "/players",
    "/teams",
    "/rankings",
    "/hall-of-fame",
    "/compare",
    "/statistics",
    "/mvp-ranking",
    "/pubg-scrims",
    "/calendar",
  ]);
  const eventsActive = isAnyPrefixActive(pathname, [
    "/events",
    "/tournaments",
    "/current-season",
    "/calendar",
    "/pubg-scrims",
  ]);
  const mediaActive = isAnyPrefixActive(pathname, [
    "/media",
    "/videos",
    "/highlights",
    "/news",
    "/community/highlights",
  ]);
  const aboutActive = isAnyPrefixActive(pathname, ["/about", "/sponsors", "/contact", "/privacy", "/terms", "/feedback"]);
  const loginActive = isAnyPrefixActive(pathname, ["/admin", "/team", "/login"]);
  const searchActive = isAnyPrefixActive(pathname, ["/search"]);

  function closeMobileNavigation() {
    setMobileOpen(false);
    setMobilePanel("main");
  }

  useEffect(() => {
    setDesktopMenu(null);
    closeMobileNavigation();
  }, [pathname]);

  useEffect(() => {
    if (!desktopMenu) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setDesktopMenu(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [desktopMenu]);

  useEffect(() => {
    if (!mobileOpen && !desktopMenu) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDesktopMenu(null);
        closeMobileNavigation();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [desktopMenu, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const mobileDrawer =
    mobileOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="xl:hidden">
            <button
              type="button"
              aria-label="Close navigation overlay"
              className="fixed inset-0 z-[9999] bg-slate-950/78 backdrop-blur-[3px]"
              onClick={closeMobileNavigation}
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="fixed inset-y-0 right-0 z-[10000] flex w-full max-w-[28rem] min-w-0 flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,rgba(8,12,23,0.98),rgba(5,8,16,0.99))] shadow-[-22px_0_80px_rgba(0,0,0,0.45)]"
            >
              <div className="border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-2">
                      <BravoLogo size={38} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[14px] font-black uppercase tracking-[0.16em] text-white">
                        Bravo Gaming
                      </p>
                      <p className="font-display text-[10px] uppercase tracking-[0.22em] text-text-muted">
                        Navigation SAP
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={closeMobileNavigation}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white transition hover:border-white/15 hover:bg-white/[0.08]"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 min-[430px]:grid-cols-3">
                  <ActionLink
                    href={watchLiveHref}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-accent-red/30 bg-accent-red/12 px-4 py-3.5 text-center font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-accent-red/55"
                    onClick={closeMobileNavigation}
                  >
                    <span className="live-dot h-1.5 w-1.5" />
                    Watch Live
                  </ActionLink>
                  <ActionLink
                    href={DISCORD_HREF}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[#5865F2]/25 bg-[#5865F2]/10 px-4 py-3.5 text-center font-display text-[11px] font-black uppercase tracking-[0.14em] text-[#d9deff] transition hover:border-[#5865F2]/40 hover:text-white"
                    onClick={closeMobileNavigation}
                  >
                    Join Discord
                  </ActionLink>
                  <ActionLink
                    href="/search"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-center font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-white/15 hover:bg-white/[0.08]"
                    onClick={closeMobileNavigation}
                  >
                    Search
                  </ActionLink>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  className={`flex h-full w-[200%] max-w-none transition-transform duration-300 ease-out ${
                    mobilePanel === "pubg" ? "-translate-x-1/2" : "translate-x-0"
                  }`}
                >
                  <div className="w-1/2 shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5">
                    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
                      <div className="mb-3 flex items-center gap-3">
                        <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-blue">
                          Explore
                        </p>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-2">
                        <MobileNavLink
                          item={{ label: "Home", href: "/", description: "Return to the platform front page.", icon: House }}
                          pathname={pathname}
                          onNavigate={closeMobileNavigation}
                        />
                        <MobilePubgButton onOpen={() => setMobilePanel("pubg")} active={pubgActive} />
                        <MobileNavLink
                          item={{ label: "Events", href: "/events", description: "Open the platform event lane.", icon: Trophy }}
                          pathname={pathname}
                          onNavigate={closeMobileNavigation}
                        />
                        <MobileNavLink
                          item={{ label: "Media", href: "/media", description: "Videos, highlights, posters, and VODs.", icon: Clapperboard }}
                          pathname={pathname}
                          onNavigate={closeMobileNavigation}
                        />
                      </div>
                    </section>

                    <div className="mt-4 grid gap-4">
                      {MOBILE_MAIN_SECTIONS.map((section) => (
                        <MobileSectionBlock
                          key={section.title}
                          section={section}
                          pathname={pathname}
                          onNavigate={closeMobileNavigation}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="w-1/2 shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5">
                    <div className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,215,0,0.12),transparent_24%),rgba(255,255,255,0.03)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setMobilePanel("main")}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-white/15 hover:bg-white/[0.08]"
                        >
                          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                          Back
                        </button>
                        <Link
                          href="/pubg"
                          onClick={closeMobileNavigation}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-[16px] border border-accent-yellow/25 bg-accent-yellow/12 px-3 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-accent-yellow/40"
                        >
                          Open Hub
                          <ArrowRight className="h-4 w-4" strokeWidth={2} />
                        </Link>
                      </div>
                      <p className="mt-4 font-display text-[11px] font-black uppercase tracking-[0.2em] text-accent-yellow">
                        PUBG Flagship
                      </p>
                      <h2 className="mt-2 font-display text-xl font-black uppercase text-white min-[390px]:text-2xl">
                        Competitive, schedule, and records in one panel
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-text-muted">
                        The mobile PUBG panel keeps the flagship lane dense but readable, without turning the drawer into a giant accordion stack.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4">
                      {MOBILE_PUBG_SECTIONS.map((section) => (
                        <MobileSectionBlock
                          key={section.title}
                          section={section}
                          pathname={pathname}
                          onNavigate={closeMobileNavigation}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header
        ref={headerRef}
        onMouseLeave={() => setDesktopMenu(null)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && headerRef.current?.contains(nextTarget)) {
            return;
          }

          setDesktopMenu(null);
        }}
        className="sticky top-0 z-[80] border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,11,20,0.96),rgba(7,11,20,0.9))] shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      >
        <div className="page-inner relative flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 xl:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <BravoLogo size={46} />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-[15px] font-black uppercase tracking-[0.16em] text-white">
              Bravo Gaming
            </p>
            <p className="font-display text-[11px] uppercase tracking-[0.22em] text-text-muted">
              Esports Nepal
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={() => {
            if (mobileOpen) {
              closeMobileNavigation();
              return;
            }

            setMobileOpen(true);
            setMobilePanel("main");
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/15 hover:bg-white/[0.08] xl:hidden"
        >
          <Menu className="h-4 w-4" strokeWidth={2} />
          {mobileOpen ? "Close" : "Menu"}
        </button>

        <nav className="hidden flex-1 items-center justify-between gap-6 xl:flex">
          <div className="flex items-center gap-2">
            {PRIMARY_LINKS.map((item) => (
              <DesktopNavLink key={item.href} item={item} pathname={pathname} />
            ))}

            <button
              type="button"
              aria-expanded={desktopMenu === "pubg"}
              aria-haspopup="dialog"
              aria-controls="pubg-mega-menu"
              onMouseEnter={() => setDesktopMenu("pubg")}
              onFocus={() => setDesktopMenu("pubg")}
              onClick={() => setDesktopMenu((current) => (current === "pubg" ? null : "pubg"))}
              className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(pubgActive, desktopMenu === "pubg")}`}
            >
              <Gamepad2 className={`h-4 w-4 ${pubgActive || desktopMenu === "pubg" ? "text-accent-yellow" : "text-text-muted"}`} strokeWidth={2} />
              <span>PUBG</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${desktopMenu === "pubg" ? "rotate-180 text-white" : pubgActive ? "text-accent-yellow" : "text-text-muted"}`}
                strokeWidth={2}
              />
            </button>

            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("events")}
              onFocusCapture={() => setDesktopMenu("events")}
            >
              <button
                type="button"
                aria-expanded={desktopMenu === "events"}
                aria-haspopup="dialog"
                aria-controls="events-menu"
                className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(eventsActive, desktopMenu === "events")}`}
                onClick={() => setDesktopMenu((current) => (current === "events" ? null : "events"))}
              >
                <Trophy className={`h-4 w-4 ${eventsActive || desktopMenu === "events" ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
                <span>Events</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${desktopMenu === "events" ? "rotate-180 text-white" : eventsActive ? "text-accent-blue" : "text-text-muted"}`}
                  strokeWidth={2}
                />
              </button>

              {desktopMenu === "events" ? (
                <DesktopDropdownPanel id="events-menu" title="Event Ecosystem" items={EVENT_ITEMS} layoutClassName="left-0 w-[400px]" />
              ) : null}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("media")}
              onFocusCapture={() => setDesktopMenu("media")}
            >
              <button
                type="button"
                aria-expanded={desktopMenu === "media"}
                aria-haspopup="dialog"
                aria-controls="media-menu"
                className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(mediaActive, desktopMenu === "media")}`}
                onClick={() => setDesktopMenu((current) => (current === "media" ? null : "media"))}
              >
                <Clapperboard className={`h-4 w-4 ${mediaActive || desktopMenu === "media" ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
                <span>Media</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${desktopMenu === "media" ? "rotate-180 text-white" : mediaActive ? "text-accent-blue" : "text-text-muted"}`}
                  strokeWidth={2}
                />
              </button>

              {desktopMenu === "media" ? (
                <DesktopDropdownPanel id="media-menu" title="Media Network" items={MEDIA_ITEMS} layoutClassName="left-0 w-[400px]" />
              ) : null}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("about")}
              onFocusCapture={() => setDesktopMenu("about")}
            >
              <button
                type="button"
                aria-expanded={desktopMenu === "about"}
                aria-haspopup="dialog"
                className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(aboutActive, desktopMenu === "about")}`}
                onClick={() => setDesktopMenu((current) => (current === "about" ? null : "about"))}
              >
                <Users className={`h-4 w-4 ${aboutActive || desktopMenu === "about" ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
                <span>About Us</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${desktopMenu === "about" ? "rotate-180 text-white" : aboutActive ? "text-accent-blue" : "text-text-muted"}`}
                  strokeWidth={2}
                />
              </button>

              {desktopMenu === "about" ? (
                <DesktopDropdownPanel id="about-menu" title="About Bravo" items={ABOUT_ITEMS} layoutClassName="right-0 w-[360px]" />
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ActionLink
              href={watchLiveHref}
              className="inline-flex items-center gap-2 rounded-[16px] border border-accent-red/30 bg-accent-red/12 px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-accent-red/55 hover:bg-accent-red/18"
            >
              <span className="live-dot h-1.5 w-1.5" />
              Watch Live
            </ActionLink>

            <ActionLink
              href={DISCORD_HREF}
              className="inline-flex items-center gap-2 rounded-[16px] border border-[#5865F2]/25 bg-[#5865F2]/10 px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] text-[#d9deff] transition hover:border-[#5865F2]/40 hover:bg-[#5865F2]/16 hover:text-white"
            >
              Join Discord
            </ActionLink>

            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("login")}
              onFocusCapture={() => setDesktopMenu("login")}
            >
              <button
                type="button"
                aria-expanded={desktopMenu === "login"}
                aria-haspopup="dialog"
                className={`inline-flex h-11 items-center gap-2 rounded-[16px] border px-4 font-display text-[11px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${topLinkClasses(loginActive, desktopMenu === "login")}`}
                onClick={() => setDesktopMenu((current) => (current === "login" ? null : "login"))}
              >
                <LogIn className={`h-4 w-4 ${loginActive || desktopMenu === "login" ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
                <span>Login</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${desktopMenu === "login" ? "rotate-180 text-white" : loginActive ? "text-accent-blue" : "text-text-muted"}`}
                  strokeWidth={2}
                />
              </button>

              {desktopMenu === "login" ? (
                <DesktopDropdownPanel id="login-menu" title="Platform Access" items={LOGIN_ITEMS} layoutClassName="right-0 w-[360px]" />
              ) : null}
            </div>

            <ActionLink
              href="/search"
              className={`inline-flex items-center gap-2 rounded-[16px] border px-4 py-2.5 font-display text-[11px] font-black uppercase tracking-[0.14em] transition ${
                searchActive
                  ? "border-accent-blue/30 bg-accent-blue/10 text-white"
                  : "border-white/10 bg-white/[0.04] text-text-muted hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Search className={`h-4 w-4 ${searchActive ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
              Search
            </ActionLink>
          </div>
        </nav>
      </div>

      {desktopMenu === "pubg" ? (
        <div id="pubg-mega-menu" className="absolute inset-x-0 top-full hidden xl:block">
          <div className="page-inner px-6 pb-4 xl:px-8">
            <div className="mt-3 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,28,0.98),rgba(6,10,18,0.98))] shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="border-b border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,215,0,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 py-5">
                <div className="flex items-center justify-between gap-6">
                  <div className="max-w-3xl">
                    <p className="font-display text-[11px] font-black uppercase tracking-[0.24em] text-accent-yellow">
                      Flagship Hub
                    </p>
                    <h2 className="mt-2 font-display text-[30px] font-black uppercase leading-none text-white">
                      PUBG is the competitive core of Bravo Gaming
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
                      Live boards, daily scrim flow, season tracking, match records, player markets, and public rankings all open from one scalable navigation surface.
                    </p>
                  </div>
                  <Link href="/pubg" className="btn-primary shrink-0">
                    Open PUBG Hub
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[1fr,1fr,1fr,0.95fr]">
                <DesktopMenuColumn title="Competitive" items={PUBG_COMPETITIVE} />
                <DesktopMenuColumn title="Live & Scheduled" items={PUBG_LIVE_AND_SCHEDULED} />
                <DesktopMenuColumn title="Records & Statistics" items={PUBG_RECORDS_AND_STATS} />

                <aside className="grid gap-3">
                  <FeatureCard card={featuredEventCard} icon={Trophy} />
                  <FeatureCard card={currentSeasonCard} icon={CalendarDays} />
                  <FeatureCard card={topTeamCard} icon={Crown} />
                </aside>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      </header>
      {mobileDrawer}
    </>
  );
}
