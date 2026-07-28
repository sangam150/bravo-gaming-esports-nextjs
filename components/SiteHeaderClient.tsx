"use client";

import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { scheduleEffectTask } from "@/lib/effect-task";
import { clearBravoSession } from "@/lib/login-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronRight, LogOut, Menu, Play, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavItem = {
  label: string;
  href: string;
};

type HeaderAccount = {
  identity: string;
  email: string;
  roleLabel: string;
  statusLabel: string;
  dashboardHref: string;
  profileHref?: string;
};

type SiteHeaderClientProps = {
  watchLiveHref: string;
  account: HeaderAccount | null;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "PUBG", href: "/pubg" },
  { label: "Events", href: "/events" },
  { label: "Leaderboards", href: "/pubg/leaderboards" },
  { label: "News", href: "/news" },
  { label: "Media", href: "/media" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "About", href: "/about" },
];

const ACCESS_LINKS = [
  { label: "General Login", href: "/login" },
  { label: "Team Portal", href: "/team/login" },
  { label: "Player Portal", href: "/player/login" },
  { label: "Admin Portal", href: "/admin/login" },
] as const;

function getActiveNavigationLabel(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname === "/leaderboard" || pathname.startsWith("/pubg/leaderboards")) return "Leaderboards";
  if (pathname.startsWith("/events") || pathname.startsWith("/tournaments") || pathname.startsWith("/calendar")) return "Events";
  if (pathname.startsWith("/news")) return "News";
  if (
    pathname.startsWith("/media") ||
    pathname.startsWith("/highlights") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/live-stream")
  ) {
    return "Media";
  }
  if (pathname.startsWith("/sponsors") || pathname.startsWith("/partners") || pathname.startsWith("/tournament-partners"))
    return "Sponsors";
  if (
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/rules") ||
    pathname.startsWith("/anti-cheat")
  ) {
    return "About";
  }
  if (
    pathname.startsWith("/pubg") ||
    pathname.startsWith("/players") ||
    pathname.startsWith("/teams") ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/results") ||
    pathname.startsWith("/rankings")
  ) {
    return "PUBG";
  }
  return "Bravo Gaming";
}

function isAccessLinkActive(pathname: string, href: string) {
  return pathname === href;
}

function desktopNavClasses(active: boolean) {
  if (active) {
    return "text-white after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-accent-blue";
  }

  return "text-text-muted hover:text-white after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-accent-blue/0 hover:after:bg-accent-blue/40";
}

function utilityClasses(primary = false) {
  if (primary) {
    return "btn-primary !h-9 px-3";
  }

  return "btn-secondary !h-9 px-3";
}

export default function SiteHeaderClient({ watchLiveHref, account }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const desktopMenuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return scheduleEffectTask(() => setMounted(true));
  }, []);

  useEffect(() => {
    return scheduleEffectTask(() => {
      setMobileOpen(false);
      setDesktopMenuOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : previousOverflow;
    if (mobileOpen) {
      requestAnimationFrame(() => {
        drawerRef.current?.querySelector<HTMLElement>("button, a")?.focus();
      });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!desktopMenuOpen) return;

    requestAnimationFrame(() => {
      desktopMenuRef.current?.querySelector<HTMLElement>("a, button:not([disabled])")?.focus();
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !desktopMenuRef.current?.contains(target) && !desktopMenuButtonRef.current?.contains(target)) {
        setDesktopMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDesktopMenuOpen(false);
      requestAnimationFrame(() => desktopMenuButtonRef.current?.focus());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopMenuOpen]);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const currentSection = useMemo(() => getActiveNavigationLabel(resolvedPathname), [resolvedPathname]);

  function closeMobileMenu(restoreFocus = false) {
    setMobileOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setDesktopMenuOpen(false);
    setMobileOpen(false);
    await Promise.allSettled([clearBravoSession(), Promise.resolve().then(() => getSupabaseBrowserClient().auth.signOut())]);
    window.location.assign("/login");
  }

  const accountControls = account ? (
    <>
      <div className="rounded-[5px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <p className="truncate text-sm font-semibold text-white">{account.identity}</p>
        {account.email !== account.identity ? <p className="mt-1 truncate text-xs text-text-muted">{account.email}</p> : null}
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-blue-light">
          {account.roleLabel} · {account.statusLabel}
        </p>
      </div>
      <Link
        href={account.dashboardHref}
        aria-current={resolvedPathname === account.dashboardHref ? "page" : undefined}
        className="btn-secondary w-full justify-center"
        onClick={() => setMobileOpen(false)}
      >
        Dashboard
      </Link>
      {account.profileHref ? (
        <Link
          href={account.profileHref}
          aria-current={resolvedPathname === account.profileHref ? "page" : undefined}
          className="btn-secondary w-full justify-center"
          onClick={() => setMobileOpen(false)}
        >
          My Profile
        </Link>
      ) : null}
      <button
        type="button"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
        className="btn-secondary w-full justify-center disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {loggingOut ? "Signing Out…" : "Logout"}
      </button>
    </>
  ) : (
    ACCESS_LINKS.map((item) => {
      const active = isAccessLinkActive(resolvedPathname, item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className={`flex min-h-12 items-center justify-between rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${
            active
              ? "border-accent-blue/30 bg-accent-blue/10 text-white"
              : "border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-white/15 hover:text-white"
          }`}
        >
          <span>{item.label}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      );
    })
  );

  const mobileDrawer =
    mounted && mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-[90] xl:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close navigation overlay"
              onClick={() => closeMobileMenu(true)}
              className="mobile-backdrop absolute inset-0 bg-black/72 backdrop-blur-sm"
            />
            <aside
              id="mobile-site-navigation"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-navigation-title"
              className="mobile-drawer absolute inset-y-0 right-0 flex h-full w-full max-w-[28rem] flex-col overflow-y-auto border-l border-white/[0.08] bg-[#020812] px-4 py-4 shadow-[-24px_0_70px_rgba(0,0,0,0.38)]"
            >
              <div className="rounded-[6px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_28%),#071321] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue">Bravo Navigation</p>
                    <h2 id="mobile-navigation-title" className="mt-3 font-display text-2xl font-black uppercase text-white">
                      Menu
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">Browse Bravo Gaming Esports or open the correct secure portal.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => closeMobileMenu(true)}
                    className="btn-secondary !h-11 !w-11 !px-0"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <nav aria-label="Primary navigation" className="esports-card p-3">
                  {NAV_ITEMS.map((item) => {
                    const active = currentSection === item.label;

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`mb-2 flex min-h-12 items-center justify-between rounded-[5px] border px-4 py-3 font-display text-sm font-semibold transition last:mb-0 ${
                          active
                            ? "border-accent-blue/30 bg-accent-blue/10 text-white"
                            : "border-white/[0.06] bg-white/[0.03] text-text-muted hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronRight className={`h-4 w-4 ${active ? "text-accent-blue" : "text-text-muted"}`} aria-hidden="true" />
                      </Link>
                    );
                  })}
                </nav>

                <section aria-labelledby="mobile-actions-heading" className="esports-card p-4">
                  <h2
                    id="mobile-actions-heading"
                    className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue"
                  >
                    Actions
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Link href="/teams/register" onClick={() => setMobileOpen(false)} className="btn-primary justify-center">
                      <UsersRound className="h-4 w-4" aria-hidden="true" />
                      Register Team
                    </Link>
                    <Link href={watchLiveHref} onClick={() => setMobileOpen(false)} className="btn-secondary justify-center">
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Watch Live
                    </Link>
                    <a
                      href={BRAVO_DISCORD_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="btn-discord justify-center sm:col-span-2"
                    >
                      Join Discord
                    </a>
                  </div>
                </section>

                <section aria-labelledby="mobile-access-heading" className="esports-card p-4">
                  <h2
                    id="mobile-access-heading"
                    className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue"
                  >
                    {account ? "Account" : "Access"}
                  </h2>
                  <div className="mt-4 grid gap-3">{accountControls}</div>
                </section>
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header
        className={`sticky top-0 z-[80] border-b transition duration-200 ${
          isScrolled
            ? "border-white/[0.1] bg-[#020711]/95 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            : "border-white/[0.08] bg-[#020711]/92 backdrop-blur-xl"
        }`}
      >
        <div className="page-inner px-4 sm:px-6 lg:px-8">
          <div className="flex h-[70px] items-center gap-3">
            <Link href="/" aria-label="Bravo Gaming Esports home" className="flex min-w-0 items-center gap-3">
              <BravoLogo size={40} />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate font-display text-lg font-bold uppercase leading-none tracking-[0.045em] text-white">Bravo Gaming</p>
                <p className="mt-1 truncate font-display text-[9px] uppercase tracking-[0.26em] text-text-muted">Esports</p>
              </div>
            </Link>

            <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
              {NAV_ITEMS.map((item) => {
                const active = currentSection === item.label;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[70px] items-center px-2 py-2 font-body text-[11px] font-medium transition 2xl:px-2.5 2xl:text-[12px] ${desktopNavClasses(
                      active,
                    )}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="relative ml-auto hidden items-center gap-2 xl:flex">
              <Link href="/teams/register" className={utilityClasses(true)}>
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                Register Team
              </Link>
              <Link href={watchLiveHref} className={utilityClasses(false)}>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Watch Live
              </Link>
              <button
                ref={desktopMenuButtonRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={desktopMenuOpen}
                aria-controls="desktop-account-access-menu"
                onClick={() => setDesktopMenuOpen((value) => !value)}
                className={utilityClasses(false)}
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {account ? "Account" : "Login"}
                <ChevronDown className={`h-4 w-4 transition ${desktopMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {desktopMenuOpen ? (
                <div
                  id="desktop-account-access-menu"
                  ref={desktopMenuRef}
                  role="group"
                  aria-label={account ? "Your account" : "Bravo access links"}
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-[95] w-72 rounded-[6px] border border-white/[0.1] bg-[#030a13]/[0.99] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <p className="px-2 pb-3 font-display text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">
                    {account ? "Your Account" : "Access Bravo"}
                  </p>
                  <div className="grid gap-2">{accountControls}</div>
                </div>
              ) : null}
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-site-navigation"
              onClick={() => setMobileOpen((value) => !value)}
              className="btn-secondary ml-auto !h-11 xl:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
              Menu
            </button>
          </div>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
