"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";

const SESSION_KEY = "bravo-home-cta-seen";

export default function HomeCommunityBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pathname !== "/") {
      setVisible(false);
      return;
    }

    if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [mounted, pathname]);

  if (!mounted || pathname !== "/" || !visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[75] px-4 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-[24px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(9,15,29,0.98),rgba(7,11,21,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="relative px-4 py-4 pr-14 sm:px-5 sm:py-5 sm:pr-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,126,245,0.24),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(239,68,68,0.14),transparent_24%)]" />
          <button
            type="button"
            aria-label="Close community banner"
            onClick={() => setVisible(false)}
            className="btn-secondary absolute right-3 top-3 !h-10 !w-10 !px-0"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent-blue/25 bg-accent-blue/10 text-accent-blue-light">
                  <BellRing className="h-4 w-4" />
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">
                  Want to play Bravo scrims?
                </p>
              </div>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                Register your team, get room updates, and follow official PUBG PC scrims and tournaments.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/teams/register" className="btn-primary">
                Register Team
              </Link>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
