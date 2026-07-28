"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MotionObserver() {
  const pathname = usePathname();
  const protectedRoute = /^\/(admin|team|dashboard)(\/|$)/.test(pathname);

  useEffect(() => {
    if (protectedRoute) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section, main .page-hero, main .hero-banner, main .esports-card, main .priority-card, main .standard-card, main .light-card",
      ),
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => (target.dataset.revealed = "true"));
      return;
    }

    targets.forEach((target) => (target.dataset.motion = "reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.revealed = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname, protectedRoute]);

  return null;
}

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const protectedRoute = /^\/(admin|team|dashboard)(\/|$)/.test(pathname);
  return (
    <div key={pathname} className={protectedRoute ? "route-static" : "route-transition"}>
      {children}
    </div>
  );
}
