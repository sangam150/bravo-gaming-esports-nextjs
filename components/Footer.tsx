import Link from "next/link";
import { Camera, MessageCircle, Music2, Play, Users } from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";
import {
  BRAVO_DISCORD_URL,
  BRAVO_FACEBOOK_URL,
  BRAVO_INSTAGRAM_URL,
  BRAVO_TIKTOK_URL,
  BRAVO_YOUTUBE_URL,
} from "@/lib/brand-links";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Leaderboards", href: "/pubg/leaderboards" },
  { label: "News", href: "/news" },
  { label: "Media", href: "/media" },
  { label: "About Us", href: "/about" },
] as const;

const competitionLinks = [
  { label: "PUBG Overview", href: "/pubg" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Scrims", href: "/pubg-scrims" },
  { label: "Rules & Format", href: "/rules" },
  { label: "Standings", href: "/pubg/leaderboards?view=teams" },
  { label: "Results", href: "/pubg/results" },
] as const;

const supportLinks = [
  { label: "Help Center", href: "/contact" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/rules" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
] as const;

const followLinks = [
  { label: "Discord", href: BRAVO_DISCORD_URL, icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Facebook", href: BRAVO_FACEBOOK_URL, icon: <Users className="h-4 w-4" /> },
  { label: "YouTube", href: BRAVO_YOUTUBE_URL, icon: <Play className="h-4 w-4" /> },
  { label: "Instagram", href: BRAVO_INSTAGRAM_URL, icon: <Camera className="h-4 w-4" /> },
  { label: "TikTok", href: BRAVO_TIKTOK_URL, icon: <Music2 className="h-4 w-4" /> },
] as const;

function FooterNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-text-muted transition hover:text-white">
      {label}
    </Link>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">{title}</p>
      <div className="mt-4 grid gap-2.5">
        {links.map((item) => (
          <FooterNavLink key={item.label} href={item.href} label={item.label} />
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(6,10,18,0.98),rgba(3,6,12,0.98))] px-5 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-6">
          <div className="grid gap-8 xl:grid-cols-[1.15fr,0.9fr,0.9fr,0.9fr,0.75fr]">
            <section className="min-w-0 xl:pr-4">
              <div className="flex items-center gap-3">
                <BravoLogo size={54} />
                <div>
                  <p className="font-display text-xl font-black uppercase text-white">Bravo Gaming</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-muted">Esports Nepal</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-7 text-text-muted">
                Building Nepal&apos;s future in competitive PUBG PC esports. Compete. Connect. Conquer.
              </p>
              <p className="mt-6 text-xs text-text-muted">
                Copyright (C) 2026 Bravo Gaming Esports Nepal. All rights reserved.
              </p>
            </section>

            <section>
              <FooterColumn title="Quick Links" links={quickLinks} />
            </section>

            <section>
              <FooterColumn title="Competition" links={competitionLinks} />
            </section>

            <section>
              <FooterColumn title="Support" links={supportLinks} />
            </section>

            <section>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">Follow Us</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {followLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white transition hover:border-accent-blue/40 hover:bg-accent-blue/10"
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </footer>
  );
}
