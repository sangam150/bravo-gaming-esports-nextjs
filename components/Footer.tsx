import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL, BRAVO_FACEBOOK_URL, BRAVO_INSTAGRAM_URL, BRAVO_TIKTOK_URL, BRAVO_YOUTUBE_URL } from "@/lib/brand-links";
import { Camera, MessageCircle, Music2, Play, Users } from "lucide-react";
import Link from "next/link";

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
  { label: "Contact Us", href: "/contact" },
  { label: "Send Feedback", href: "/feedback" },
  { label: "Competition Rules", href: "/rules" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
] as const;

const followLinks = [
  {
    label: "Discord",
    href: BRAVO_DISCORD_URL,
    icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Facebook",
    href: BRAVO_FACEBOOK_URL,
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "YouTube",
    href: BRAVO_YOUTUBE_URL,
    icon: <Play className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Instagram",
    href: BRAVO_INSTAGRAM_URL,
    icon: <Camera className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "TikTok",
    href: BRAVO_TIKTOK_URL,
    icon: <Music2 className="h-4 w-4" aria-hidden="true" />,
  },
] as const;

function FooterNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-[13px] leading-5 text-text-muted transition hover:text-white">
      {label}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <nav aria-label={`${title} links`}>
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.04em] text-white">{title}</h2>
      <div className="mt-3 grid gap-1.5">
        {links.map((item) => (
          <FooterNavLink key={item.label} href={item.href} label={item.label} />
        ))}
      </div>
    </nav>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(112,145,180,0.2)] bg-[#020711] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="page-inner grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_repeat(3,minmax(0,0.8fr))_1fr] lg:gap-10">
        <section aria-label="About Bravo Gaming Esports" className="min-w-0 lg:pr-4">
          <div className="flex items-center gap-3">
            <BravoLogo size={46} />
            <div>
              <p className="font-display text-xl font-bold uppercase leading-none tracking-[0.04em] text-white">Bravo Gaming</p>
              <p className="mt-1 font-display text-[9px] uppercase tracking-[0.25em] text-text-muted">Esports</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-6 text-text-muted">
            Building Nepal&apos;s future in competitive PUBG PC esports. Compete. Connect. Conquer.
          </p>
          <p className="mt-5 text-[11px] leading-5 text-text-muted">
            © {currentYear} Bravo Gaming Esports.
            <br />
            All rights reserved.
          </p>
        </section>

        <section aria-label="Quick links">
          <FooterColumn title="Quick Links" links={quickLinks} />
        </section>

        <section aria-label="Competition links">
          <FooterColumn title="Competition" links={competitionLinks} />
        </section>

        <section aria-label="Support links">
          <FooterColumn title="Support" links={supportLinks} />
        </section>

        <section aria-labelledby="footer-follow-heading">
          <h2 id="footer-follow-heading" className="font-display text-sm font-bold uppercase tracking-[0.04em] text-white">
            Follow Us
          </h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {followLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                title={item.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-transparent text-white transition hover:border-accent-blue/60 hover:bg-accent-blue/10"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </section>
      </div>
    </footer>
  );
}
