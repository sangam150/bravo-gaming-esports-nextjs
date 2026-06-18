"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Gamepad2,
  Handshake,
  House,
  Info,
  LockKeyhole,
  LogIn,
  Mail,
  Menu,
  Newspaper,
  ScrollText,
  Shield,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";

type NavLinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  flagship?: boolean;
};

type MobileNavGroup = {
  title: string;
  items: NavLinkItem[];
};

const mainNavItems: NavLinkItem[] = [
  { label: "Home", href: "/", icon: House },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Events", href: "/events", icon: Trophy },
  { label: "PUBG", href: "/pubg", icon: Gamepad2, flagship: true },
  { label: "Rankings", href: "/rankings", icon: BarChart3 },
  { label: "Media", href: "/media", icon: Clapperboard },
];

const moreNavItems: NavLinkItem[] = [
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Teams", href: "/teams", icon: Shield },
  { label: "Players", href: "/players", icon: UserRound },
  { label: "Matches", href: "/matches", icon: Swords },
  { label: "Sponsors", href: "/sponsors", icon: Handshake },
  { label: "Community", href: "/community", icon: Users },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: Mail },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck },
  { label: "Terms", href: "/terms", icon: ScrollText },
];

const mobileNavGroups: MobileNavGroup[] = [
  { title: "Main", items: mainNavItems },
  {
    title: "Competition",
    items: [
      { label: "Teams", href: "/teams", icon: Shield },
      { label: "Players", href: "/players", icon: UserRound },
      { label: "Matches", href: "/matches", icon: Swords },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Sponsors", href: "/sponsors", icon: Handshake },
      { label: "Community", href: "/community", icon: Users },
      { label: "About", href: "/about", icon: Info },
      { label: "Contact", href: "/contact", icon: Mail },
    ],
  },
  {
    title: "Access",
    items: [
      { label: "Admin", href: "/admin", icon: LockKeyhole },
      { label: "Team Login", href: "/team", icon: LogIn },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function isGroupActive(pathname: string, items: NavLinkItem[]) {
  return items.some((item) => isActive(pathname, item.href));
}

function desktopNavClasses(active: boolean, flagship?: boolean) {
  if (active && flagship) {
    return "border-accent-yellow/20 bg-[linear-gradient(180deg,rgba(255,215,0,0.12),rgba(255,255,255,0.03))] text-white shadow-[0_0_0_1px_rgba(255,215,0,0.08),0_16px_40px_rgba(0,0,0,0.18)]";
  }

  if (active) {
    return "border-accent-blue/25 bg-[linear-gradient(180deg,rgba(29,155,240,0.14),rgba(255,255,255,0.03))] text-white shadow-[0_0_0_1px_rgba(29,155,240,0.08),0_16px_40px_rgba(0,0,0,0.18)]";
  }

  if (flagship) {
    return "border-transparent text-slate-100 hover:border-accent-yellow/15 hover:bg-white/[0.06] hover:text-white";
  }

  return "border-transparent text-text-muted hover:border-white/10 hover:bg-white/[0.06] hover:text-white";
}

function desktopIconClasses(active: boolean, flagship?: boolean) {
  if (flagship) {
    return active ? "text-accent-yellow" : "text-accent-yellow/80";
  }

  return active ? "text-accent-blue" : "text-text-muted";
}

function NavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLinkItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`group relative flex items-center gap-2.5 rounded-[16px] border px-4 py-3 font-display text-[12px] font-bold uppercase tracking-[0.08em] transition-all duration-200 ${desktopNavClasses(
        active,
        item.flagship
      )}`}
    >
      <Icon className={`h-[15px] w-[15px] shrink-0 transition-colors ${desktopIconClasses(active, item.flagship)}`} strokeWidth={2} />
      <span>{item.label}</span>
      {active ? (
        <span
          className={`absolute bottom-1.5 left-4 right-4 h-[3px] rounded-full ${
            item.flagship
              ? "bg-accent-yellow shadow-[0_0_14px_rgba(255,215,0,0.55)]"
              : "bg-accent-blue shadow-[0_0_14px_rgba(29,155,240,0.55)]"
          }`}
        />
      ) : null}
    </Link>
  );
}

function MobileNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLinkItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-[18px] border px-3.5 py-3 text-sm font-semibold transition ${
        active
          ? item.flagship
            ? "border-accent-yellow/20 bg-accent-yellow/10 text-white"
            : "border-accent-blue/20 bg-accent-blue/10 text-white"
          : "border-white/[0.06] bg-black/10 text-text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] border ${
          item.flagship
            ? "border-accent-yellow/15 bg-accent-yellow/10 text-accent-yellow"
            : active
              ? "border-accent-blue/15 bg-accent-blue/10 text-accent-blue"
              : "border-white/10 bg-white/[0.03] text-text-muted"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [moreOpen]);

  const moreActive = isGroupActive(pathname, moreNavItems);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,11,20,0.96),rgba(7,11,20,0.9))] shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="page-inner flex items-center justify-between gap-5 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <BravoLogo size={46} />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-[15px] font-bold uppercase tracking-[0.14em] text-white">Bravo Gaming</p>
            <p className="font-display text-[11px] uppercase tracking-[0.2em] text-text-muted">Esports Nepal</p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/15 hover:bg-white/[0.08] xl:hidden"
        >
          <Menu className="h-4 w-4" strokeWidth={2} />
          {mobileOpen ? "Close" : "Menu"}
        </button>

        <nav className="hidden min-w-0 flex-1 items-center justify-between xl:flex">
          <div className="flex min-w-0 items-center gap-2">
            {mainNavItems.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}

            <div ref={moreMenuRef} className="relative" onMouseLeave={() => setMoreOpen(false)}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onMouseEnter={() => setMoreOpen(true)}
                onFocus={() => setMoreOpen(true)}
                onClick={() => setMoreOpen(true)}
                className={`group relative flex items-center gap-2.5 rounded-[16px] border px-4 py-3 font-display text-[12px] font-bold uppercase tracking-[0.08em] transition-all duration-200 ${
                  moreActive || moreOpen
                    ? "border-accent-blue/20 bg-[linear-gradient(180deg,rgba(29,155,240,0.12),rgba(255,255,255,0.03))] text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                    : "border-transparent text-text-muted hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Menu className={`h-[15px] w-[15px] ${moreActive || moreOpen ? "text-accent-blue" : "text-text-muted"}`} strokeWidth={2} />
                <span>More</span>
                <ChevronDown
                  className={`h-[15px] w-[15px] transition-transform ${moreOpen ? "rotate-180 text-white" : moreActive ? "text-accent-blue" : "text-text-muted"}`}
                  strokeWidth={2}
                />
                {moreActive || moreOpen ? (
                  <span className="absolute bottom-1.5 left-4 right-4 h-[3px] rounded-full bg-accent-blue shadow-[0_0_14px_rgba(29,155,240,0.55)]" />
                ) : null}
              </button>

              {moreOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+14px)] z-50 w-72 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.98),rgba(9,14,25,0.98))] p-2 shadow-[0_28px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                >
                  <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-2">
                    {moreNavItems.map((item) => {
                      const active = isActive(pathname, item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-[18px] px-3 py-3 transition ${
                            active
                              ? "bg-accent-blue/10 text-white"
                              : "text-text-muted hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border ${
                              active
                                ? "border-accent-blue/20 bg-accent-blue/10 text-accent-blue"
                                : "border-white/10 bg-white/[0.03] text-text-muted group-hover:border-white/15 group-hover:text-white"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={2} />
                          </span>
                          <span className="flex-1 font-display text-[11px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
                          <ChevronRight className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted group-hover:text-white"}`} strokeWidth={2} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/live-stream"
              className="inline-flex items-center gap-2 rounded-[16px] border border-accent-red/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-accent-red/55 hover:bg-accent-red/10"
            >
              <span className="live-dot h-1.5 w-1.5" />
              Watch Live
            </Link>

            <a
              href="https://kamaucha.me/bravo"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[16px] border border-[#5865F2]/25 bg-[#5865F2]/10 px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-[#d9deff] transition hover:border-[#5865F2]/40 hover:bg-[#5865F2]/16 hover:text-white"
            >
              Join Discord
            </a>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-[16px] border border-transparent px-3.5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted transition hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
            >
              <LockKeyhole className="h-4 w-4" strokeWidth={2} />
              Admin
            </Link>

            <Link
              href="/team"
              className="inline-flex items-center gap-2 rounded-[16px] bg-accent-blue px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(29,155,240,0.24)] transition hover:bg-blue-400 hover:shadow-[0_16px_34px_rgba(29,155,240,0.3)]"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              Team Login
            </Link>
          </div>
        </nav>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,14,25,0.98),rgba(7,11,20,0.98))] xl:hidden">
          <div className="page-inner max-h-[calc(100vh-84px)] overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid gap-4">
              {mobileNavGroups.map((group) => (
                <div key={group.title} className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
                  <div className="mb-3 flex items-center gap-3">
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-accent-blue">{group.title}</p>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <MobileNavItem key={item.href} item={item} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/live-stream"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-accent-red/30 bg-accent-red/10 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-accent-red/55"
              >
                <span className="live-dot h-1.5 w-1.5" />
                Watch Live
              </Link>
              <a
                href="https://kamaucha.me/bravo"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#5865F2]/25 bg-[#5865F2]/10 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9deff] transition hover:border-[#5865F2]/40 hover:text-white"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
