import Link from "next/link";
import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_SOCIAL_LINKS } from "@/lib/brand-links";
import { getHomepageContent } from "@/lib/platform-content";

function FooterLink({ href, label }: { href: string; label: string }) {
  const className = "text-sm text-text-muted transition hover:text-white";

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
    <footer className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="rounded-[30px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(8,14,28,0.98),rgba(6,10,20,0.98))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <BravoLogo size={42} />
                <div>
                  <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">
                    Bravo Gaming
                  </p>
                  <p className="font-display text-[10px] font-black uppercase tracking-[0.22em] text-accent-blue">
                    {content.footerTagline}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-xl text-sm leading-7 text-text-muted">{content.footerDescription}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {content.footerHighlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                      {highlight.label}
                    </p>
                    <p className="mt-2 font-display text-lg font-black uppercase text-white">
                      {highlight.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <FooterAction
                  href={content.footerPrimaryHref}
                  label={content.footerPrimaryLabel}
                  variant="primary"
                />
                <FooterAction
                  href={content.footerSecondaryHref}
                  label={content.footerSecondaryLabel}
                  variant="secondary"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {content.footerColumns.map((column) => (
                <div key={column.id}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                    {column.title}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={`${column.id}-${link.href}`}>
                        <FooterLink href={link.href} label={link.label} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/[0.06] pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {BRAVO_SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-display text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:border-accent-blue/30 hover:bg-accent-blue/10"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <p>{content.footerBottomPrimary}</p>
            <p>{content.footerBottomSecondary}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
