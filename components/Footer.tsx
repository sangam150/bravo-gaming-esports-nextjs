import Link from "next/link";
import { Camera, MessageCircle, Music2, Play, Users } from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL, BRAVO_SOCIAL_LINKS } from "@/lib/brand-links";

const platformLinks = [
  { label: "PUBG Hub", href: "/pubg" },
  { label: "Leaderboards", href: "/pubg/leaderboards" },
  { label: "Events", href: "/events" },
  { label: "Teams", href: "/teams" },
  { label: "Players", href: "/players" },
  { label: "Match Center", href: "/matches" },
] as const;

const communityLinks = [
  { label: "News", href: "/news" },
  { label: "Media", href: "/media" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "About Us", href: "/about" },
] as const;

const supportLinks = [
  { label: "Rules", href: "/rules" },
  { label: "Anti-Cheat", href: "/anti-cheat" },
  { label: "Contact", href: "/contact" },
  { label: "Sponsor Us", href: "/about/sponsor-us" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

const socialIcons = {
  Instagram: <Camera className="h-4 w-4" />,
  Discord: <MessageCircle className="h-4 w-4" />,
  YouTube: <Play className="h-4 w-4" />,
  Facebook: <Users className="h-4 w-4" />,
  TikTok: <Music2 className="h-4 w-4" />,
} as const;

function FooterNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-text-muted transition hover:text-white">
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="light-card rounded-[28px] p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr,0.82fr]">
            <section className="min-w-0">
              <div className="flex items-center gap-3">
                <BravoLogo size={56} />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-accent-blue-light">
                    Bravo Gaming Esports
                  </p>
                  <h2 className="mt-1.5 font-display text-xl font-black uppercase text-white">
                    Nepal&apos;s PUBG PC home base
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-lg text-sm leading-6 text-text-muted">
                Daily scrims, tournament coverage, standings, results, and community updates for Nepal&apos;s
                competitive PUBG scene.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link href="/live-stream" className="btn-primary !h-9 !px-3.5">
                  Watch Live
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary !h-9 !px-3.5">
                  Join Discord
                </a>
              </div>
            </section>

            <section className="grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Platform</p>
                <div className="mt-3 grid gap-2">
                  {platformLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Community</p>
                <div className="mt-3 grid gap-2">
                  {communityLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Support</p>
                <div className="mt-3 grid gap-2">
                  {supportLinks.map((item) => (
                    <FooterNavLink key={item.label} href={item.href} label={item.label} />
                  ))}
                </div>
              </div>
            </section>

            <section>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Social</p>
              <p className="mt-2 text-sm text-text-muted">Official Bravo channels</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {BRAVO_SOCIAL_LINKS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0f172a] text-white transition hover:scale-[1.04] hover:border-accent-blue/55 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)]"
                  >
                    {socialIcons[item.label]}
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-2 border-t border-white/[0.08] pt-4 text-xs text-text-muted md:grid-cols-3 md:items-center">
            <p className="md:text-left">Copyright (C) 2026 Bravo Gaming Esports Nepal</p>
            <p className="md:text-center">PUBG PC | Scrims | Tournaments | Rankings | Community</p>
            <p className="md:text-right">Built for Nepal esports</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
