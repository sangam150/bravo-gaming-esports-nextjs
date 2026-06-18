import Link from "next/link";
import BravoLogo from "@/components/ui/BravoLogo";
import { getHomepageContent } from "@/lib/platform-content";

function FooterLinkItem({ label, href }: { label: string; href: string }) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-sm text-text-muted transition hover:text-accent-blue">
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className="text-sm text-text-muted transition hover:text-accent-blue">
      {label}
    </Link>
  );
}

function FooterAction({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
}) {
  const className = variant === "primary" ? "btn-primary" : "btn-secondary";

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default async function Footer() {
  const content = await getHomepageContent();

  return (
    <footer className="mt-12 border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,17,0.98),rgba(4,7,13,1))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(0,163,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,106,0,0.14),transparent_32%),rgba(10,13,20,0.92)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="grid gap-10 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <BravoLogo size={40} />
                <div>
                  <p className="font-display text-sm font-bold uppercase text-white">{content.footerTitle}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-blue">{content.footerTagline}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-text-muted">{content.footerDescription}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {content.footerHighlights.map((highlight) => (
                  <div key={highlight.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{highlight.label}</p>
                    <p className="mt-1 font-display text-lg font-black uppercase text-white">{highlight.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <FooterAction href={content.footerPrimaryHref} label={content.footerPrimaryLabel} variant="primary" />
                <FooterAction href={content.footerSecondaryHref} label={content.footerSecondaryLabel} variant="secondary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {content.footerColumns.map((column) => (
                <div key={column.id}>
                  <p className="text-label font-bold uppercase text-text-muted">{column.title}</p>
                  <ul className="mt-3 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={`${column.id}-${link.href}`}>
                        <FooterLinkItem label={link.label} href={link.href} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>{content.footerBottomPrimary}</p>
            <p>{content.footerBottomSecondary}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
