"use client";

import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { scheduleEffectTask } from "@/lib/effect-task";
import { clearBravoSession } from "@/lib/login-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronRight, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavItem = {
  label: string;
  href: string;
  prefixes: string[];
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
  { label: "Home", href: "/", prefixes: ["/"] },
  { label: "PUBG", href: "/pubg", prefixes: ["/pubg", "/leaderboard", "/rankings", "/results", "/matches"] },
  { label: "Events", href: "/events", prefixes: ["/events", "/tournaments", "/calendar"] },
  { label: "Media", href: "/media", prefixes: ["/media", "/news", "/highlights", "/videos", "/live-stream"] },
  {
    label: "About Us",
    href: "/about",
    prefixes: ["/about", "/contact", "/feedback", "/privacy", "/terms", "/rules", "/anti-cheat", "/sponsors"],
  },
];

const ACCESS_LINKS = [
  { label: "General Login", href: "/login" },
  { label: "Team Portal", href: "/team/login" },
  { label: "Player Portal", href: "/player/login" },
  { label: "Admin Portal", href: "/admin/login" },
] as const;

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
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
    return "btn-primary !h-11 rounded-[14px] px-3.5";
  }

  return "btn-secondary !h-11 rounded-[14px] px-3.5";
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

  const currentSection = useMemo(
    () => NAV_ITEMS.find((item) => isActive(resolvedPathname, item.prefixes))?.label ?? "Bravo Gaming",
    [resolvedPathname],
  );

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
      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
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
          className={`flex min-h-12 items-center justify-between rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
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
              className="mobile-drawer absolute inset-y-0 right-0 flex h-full w-full max-w-[28rem] flex-col overflow-y-auto border-l border-white/[0.08] bg-[linear-gradient(180deg,rgba(6,10,20,0.98),rgba(5,8,15,0.98))] px-4 py-4 shadow-[-24px_0_70px_rgba(0,0,0,0.38)]"
            >
              <div className="rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_28%),linear-gradient(180deg,rgba(12,18,34,0.95),rgba(8,13,26,0.95))] p-5">
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
                    const active = isActive(resolvedPathname, item.prefixes);

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`mb-2 flex min-h-12 items-center justify-between rounded-[18px] border px-4 py-3 font-display text-[11px] font-black uppercase tracking-[0.14em] transition last:mb-0 ${
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
                      Register Team
                    </Link>
                    <Link href={watchLiveHref} onClick={() => setMobileOpen(false)} className="btn-secondary justify-center">
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
            ? "border-white/[0.08] bg-bg-secondary/92 shadow-[0_12px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl"
            : "border-white/[0.06] bg-bg-secondary/78 backdrop-blur-xl"
        }`}
      >
        <div className="page-inner px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center gap-3 rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,16,30,0.98),rgba(7,12,24,0.98))] px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <Link href="/" aria-label="Bravo Gaming Esports home" className="flex min-w-0 items-center gap-3">
              <BravoLogo size={44} />
              <div className="hidden min-w-0 md:block">
                <p className="truncate font-display text-[1rem] font-black uppercase tracking-[0.08em] text-white">Bravo Gaming</p>
                <p className="truncate font-display text-[10px] uppercase tracking-[0.22em] text-text-muted">Esports Nepal</p>
              </div>
            </Link>

            <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(resolvedPathname, item.prefixes);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-2.5 py-2 font-display text-[11px] font-semibold tracking-[0.01em] transition 2xl:px-3 2xl:text-[12px] ${desktopNavClasses(
                      active,
                    )}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="relative ml-auto hidden items-center gap-2 xl:flex">
              <Link href={watchLiveHref} className={utilityClasses(true)}>
                Watch Live
              </Link>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord !h-11 rounded-[14px] px-3.5">
                Join Discord
              </a>
              <button
                ref={desktopMenuButtonRef}
                type="button"
                aria-expanded={desktopMenuOpen}
                aria-controls="desktop-account-access-menu"
                onClick={() => setDesktopMenuOpen((value) => !value)}
                className={utilityClasses(false)}
              >
                {account ? "Account" : "Login"}
                <ChevronDown className={`h-4 w-4 transition ${desktopMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {desktopMenuOpen ? (
                <div
                  id="desktop-account-access-menu"
                  ref={desktopMenuRef}
                  role="group"
                  aria-label={account ? "Your account" : "Bravo access links"}
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-[95] w-72 rounded-[20px] border border-white/[0.1] bg-[#080d18]/[0.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl"
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

          <div className="mt-2 hidden items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted sm:flex xl:hidden">
            <span>Current section: {currentSection}</span>
            <Link href="/teams/register" className="transition hover:text-white">
              Register Team
            </Link>
          </div>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
