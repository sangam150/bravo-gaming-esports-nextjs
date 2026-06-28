import Link from "next/link";
import { Camera, MessageCircle, Music2, Play, Users } from "lucide-react";

const platformLinks = [
  { label: "PUBG Hub", href: "/pubg" },
  { label: "Leaderboards", href: "/pubg/leaderboards" },
  { label: "Events", href: "/events" },
  { label: "Teams", href: "/teams" },
  { label: "Players", href: "/players" },
  { label: "Match Center", href: "/matches" },
] as const;

const communityLinks = [
  { label: "News & Media", href: "/news-media" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Contact", href: "/contact" },
  { label: "About Us", href: "/about" },
] as const;

const supportLinks = [
  { label: "Rules", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/bravo_esport/",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    label: "Discord",
    href: "https://discord.gg/kHRZXbMwK5",
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@bravogamingnepal7981",
    icon: <Play className="h-5 w-5" />,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/",
    icon: <Music2 className="h-5 w-5" />,
  },
] as const;

function FooterNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-text-muted transition hover:text-white">
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="light-card rounded-[30px] p-6 sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.15fr,1fr,0.85fr]">
            <section>
              <img
                src="/images/bravo-logo.svg"
                alt="Bravo Gaming Esports"
                className="h-16 w-auto brightness-0 invert"
              />
              <p className="mt-5 max-w-xl text-sm leading-7 text-text-muted">
                Bravo Gaming Esports is Nepal&apos;s competitive PUBG PC platform, delivering daily scrims,
                tournaments, leaderboards, statistics, and community events.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/live-stream" className="btn-primary">
                  Watch Live
                </Link>
                <a href="https://discord.gg/kHRZXbMwK5" target="_blank" rel="noreferrer" className="btn-secondary">
                  Join Discord
                </a>
              </div>
            </section>

            <section className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Platform</p>
                <div className="mt-4 grid gap-2.5">
                  {platformLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Community</p>
                <div className="mt-4 grid gap-2.5">
                  {communityLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Support</p>
                <div className="mt-4 grid gap-2.5">
                  {supportLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>
            </section>

            <section>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Follow Bravo</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title={item.label}
                    className="group relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0f172a] text-white transition duration-200 hover:scale-[1.04] hover:border-accent-blue/55 hover:shadow-[0_0_20px_rgba(59,130,246,0.45)]"
                  >
                    {item.icon}
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      {item.label}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-3 border-t border-white/[0.08] pt-5 text-xs text-text-muted md:grid-cols-3 md:items-center">
            <p className="md:text-left">Copyright © 2026 Bravo Gaming Esports Nepal</p>
            <p className="md:text-center">PUBG PC • Scrims • Tournaments • Rankings • Community</p>
            <p className="md:text-right">Made for Nepal Esports 🇳🇵</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
