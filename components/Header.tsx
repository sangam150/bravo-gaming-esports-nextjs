"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import BravoLogo from "@/components/ui/BravoLogo";

const navItems = [
  { label: "Home", href: "/" },
  {
    label: "PUBG PC",
    items: [
      { label: "Daily Scrims", href: "/pubg-scrims" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Schedule", href: "/schedule" },
      { label: "Results", href: "/results" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Teams", href: "/teams" },
      { label: "Players", href: "/players" },
      { label: "MVP Rankings", href: "/mvp-ranking" },
      { label: "Hall of Fame", href: "/hall-of-fame" },
    ],
  },
  {
    label: "Live",
    items: [
      { label: "Live Stream", href: "/live-stream" },
      { label: "Stream Schedule", href: "/stream-schedule" },
      { label: "Latest Videos", href: "/videos" },
      { label: "Highlights", href: "/highlights" },
    ],
  },
  {
    label: "Esports",
    items: [
      { label: "Current Season", href: "/current-season" },
      { label: "Championships", href: "/championships" },
      { label: "Statistics", href: "/statistics" },
      { label: "Sponsors", href: "/sponsors" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Community Hub", href: "/community" },
      { label: "Announcements", href: "/community/announcements" },
      { label: "Giveaways", href: "/giveaways" },
      { label: "Feedback", href: "/feedback" },
    ],
  },
  {
    label: "About",
    items: [
      { label: "About Bravo", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Media Kit", href: "/about/media-kit" },
      { label: "Sponsor Us", href: "/about/sponsor-us" },
      { label: "Partners", href: "/partners" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-bg-primary">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <BravoLogo size={40} />
          <div className="hidden sm:block">
            <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-white">Bravo Gaming</p>
            <p className="font-display text-[10px] uppercase tracking-[0.14em] text-text-muted">Esports Nepal</p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
          className="flex h-10 items-center justify-center rounded-btn border border-white/[0.08] bg-bg-card px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white lg:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav className="hidden flex-1 items-center justify-between lg:flex">
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                {item.items ? (
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-2 font-display text-label font-bold uppercase tracking-[0.1em] transition hover:text-white ${
                      item.items.some((subItem) => isActive(pathname, subItem.href))
                        ? "text-accent-blue"
                        : "text-text-muted"
                    }`}
                  >
                    {item.label} <span className="text-[8px]">v</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`relative px-3 py-2 font-display text-label font-bold uppercase tracking-[0.1em] transition hover:text-white ${
                      isActive(pathname, item.href) ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {item.label}
                    {isActive(pathname, item.href) && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent-blue" />
                    )}
                  </Link>
                )}
                {item.items && (
                  <div className="invisible absolute left-0 top-full z-50 mt-0 w-52 rounded-card border border-white/[0.08] bg-bg-card p-1.5 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`block rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-bg-hover hover:text-white ${
                          isActive(pathname, subItem.href) ? "text-accent-blue" : "text-text-muted"
                        }`}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/live-stream" className="btn-watch-live !px-4 !py-2">
              <span className="live-dot h-1.5 w-1.5" /> Watch Live
            </Link>
            <a href="https://kamaucha.me/bravo" target="_blank" rel="noreferrer" className="btn-discord !px-4 !py-2">
              Join Discord
            </a>
          </div>
        </nav>
      </div>

      {open && (
        <div className="border-t border-white/[0.08] bg-bg-card px-4 py-4 lg:hidden">
          {navItems.map((item) =>
            item.items ? (
              <div key={item.label} className="mb-3">
                <p className="mb-1 px-2 text-label font-bold uppercase text-text-muted">{item.label}</p>
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={() => setOpen(false)}
                    className="block rounded px-3 py-2 text-sm text-white hover:bg-bg-hover"
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 font-bold text-white"
              >
                {item.label}
              </Link>
            )
          )}
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/live-stream" className="btn-watch-live text-center" onClick={() => setOpen(false)}>
              Watch Live
            </Link>
            <a href="https://kamaucha.me/bravo" className="btn-discord text-center">
              Join Discord
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
