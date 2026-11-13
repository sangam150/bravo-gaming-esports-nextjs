"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MotionObserver() {
  const pathname = usePathname();
  const protectedRoute = /^\/(admin|team|dashboard|overlay)(\/|$)/.test(pathname);

  useEffect(() => {
    if (protectedRoute) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section, main .page-hero, main .hero-banner, main .esports-card, main .priority-card, main .standard-card, main .light-card",
      ),
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const styles = getComputedStyle(document.documentElement);
    const configuredDuration = styles.getPropertyValue("--motion-section").trim();
    const durationValue = Number.parseFloat(configuredDuration) * (configuredDuration.endsWith("ms") ? 1 : 1000);
    const duration = Number.isFinite(durationValue) && durationValue >= 0 ? durationValue : 420;
    const easing = styles.getPropertyValue("--ease-out").trim() || "cubic-bezier(0.22, 1, 0.36, 1)";
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          // A streamed Client Component may still be waiting to hydrate. Native
          // animations preserve its React-owned markup instead of adding attrs.
          if (typeof target.animate === "function") {
            try {
              const animation = target.animate(
                [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
                { duration, easing },
              );
              animations.add(animation);
              animation.addEventListener("finish", () => { animations.delete(animation); animation.cancel(); }, { once: true });
            } catch {
              // Decorative motion must never hide content or break navigation.
            }
          }
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [pathname, protectedRoute]);

  return null;
}

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const protectedRoute = /^\/(admin|team|dashboard|overlay)(\/|$)/.test(pathname);
  return (
    <div key={pathname} className={protectedRoute ? "route-static" : "route-transition"}>
      {children}
    </div>
  );
}
