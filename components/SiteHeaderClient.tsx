"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  Menu,
  Radio,
  X,
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

type NavItem = {
  label: string;
  href: string;
  prefixes: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", prefixes: ["/"] },
  { label: "PUBG", href: "/pubg", prefixes: ["/pubg"] },
  { label: "Events", href: "/events", prefixes: ["/events"] },
  { label: "Leaderboards", href: "/pubg/leaderboards", prefixes: ["/pubg/leaderboards", "/leaderboard", "/rankings"] },
  { label: "Teams", href: "/pubg/teams", prefixes: ["/pubg/teams", "/teams"] },
  { label: "Players", href: "/pubg/players", prefixes: ["/pubg/players", "/players"] },
  { label: "Sponsors", href: "/sponsors", prefixes: ["/sponsors", "/partners"] },
  { label: "About", href: "/about", prefixes: ["/about", "/contact", "/privacy", "/terms", "/rules", "/anti-cheat"] },
];

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function desktopNavClasses(active: boolean) {
  if (active) {
    return "bg-accent-blue/14 text-accent-blue border-accent-blue/30";
  }

  return "border-transparent text-text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-white";
}

function utilityClasses(primary = false) {
  if (primary) {
    return "btn-primary h-11 px-4";
  }

  return "btn-secondary h-11 px-3.5";
}

type SiteHeaderClientProps = {
  featuredEventCard?: HeaderFeatureCard;
  currentSeasonCard?: HeaderFeatureCard;
  topTeamCard?: HeaderFeatureCard;
  watchLiveHref: string;
};

export default function SiteHeaderClient({ watchLiveHref }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const currentSection = useMemo(
    () => NAV_ITEMS.find((item) => isActive(resolvedPathname, item.prefixes))?.label ?? "Bravo Gaming",
    [resolvedPathname]
  );

  const mobileDrawer =
    mounted && mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-[90] xl:hidden">
            <button
              type="button"
              aria-label="Close navigation overlay"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/72 backdrop-blur-sm"
            />
            <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-[28rem] flex-col overflow-y-auto border-l border-white/[0.08] bg-[linear-gradient(180deg,rgba(6,10,20,0.98),rgba(5,8,15,0.98))] px-4 py-4 shadow-[-24px_0_70px_rgba(0,0,0,0.38)]">
              <div className="rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_28%),linear-gradient(180deg,rgba(12,18,34,0.95),rgba(8,13,26,0.95))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue">
                      Bravo Navigation
                    </p>
                    <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">
                      Quick Navigation
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                      Home, PUBG, events, and tournament routes with direct quick actions for registration, live coverage, and login.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setMobileOpen(false)}
                    className="btn-secondary !h-11 !w-11 !px-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <section className="esports-card p-3">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(resolvedPathname, item.prefixes);

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={`mb-2 flex items-center justify-between rounded-[18px] border px-4 py-3 font-display text-[11px] font-black uppercase tracking-[0.14em] transition last:mb-0 ${
                          active
                            ? "border-accent-blue/30 bg-accent-blue/10 text-white"
                            : "border-white/[0.06] bg-white/[0.03] text-text-muted hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronRight className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted"}`} />
                      </Link>
                    );
                  })}
                </section>

                <section className="esports-card p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue">
                      Actions
                    </p>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Link href="/teams/register" className="btn-primary justify-center">
                      Register Team
                    </Link>
                    <Link href={watchLiveHref || "/live-stream"} className="btn-watch-live justify-center">
                      <Radio className="h-3.5 w-3.5" />
                      Watch Live
                    </Link>
                    <Link href="/login" className="btn-secondary justify-center">
                      Login
                    </Link>
                  </div>
                </section>
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header
        className={`sticky top-0 z-[80] border-b transition duration-200 ${
          isScrolled
            ? "border-white/[0.08] bg-bg-secondary/85 shadow-[0_12px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="page-inner px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center gap-3 rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <BravoLogo size={44} />
              <div className="hidden min-w-0 md:block">
                <p className="truncate font-display text-[14px] font-black uppercase tracking-[0.16em] text-white">
                  Bravo Gaming
                </p>
                <p className="truncate font-display text-[10px] uppercase tracking-[0.22em] text-text-muted">
                  Esports Nepal
                </p>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(resolvedPathname, item.prefixes);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-[14px] border px-3 py-2 font-display text-[10px] font-black uppercase tracking-[0.14em] transition ${desktopNavClasses(
                      active
                    )}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto hidden items-center gap-2 xl:flex">
              <Link href="/teams/register" className={utilityClasses(true)}>
                Register Team
              </Link>
              <Link href={watchLiveHref || "/live-stream"} className="btn-watch-live">
                <span className="live-dot h-1.5 w-1.5" />
                Watch Live
              </Link>
              <Link href="/login" className={utilityClasses()}>
                Login
              </Link>
            </div>

            <button
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
              className="btn-secondary ml-auto !h-11 xl:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Menu
            </button>
          </div>

          <div className="mt-2 hidden items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted sm:flex xl:hidden">
            <span>Current section: {currentSection}</span>
            <div className="flex items-center gap-3">
              <Link href="/teams/register" className="transition hover:text-white">
                Register Team
              </Link>
              <Link href={watchLiveHref || "/live-stream"} className="transition hover:text-white">
                Watch Live
              </Link>
            </div>
          </div>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
