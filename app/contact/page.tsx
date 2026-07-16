import type { Metadata } from "next";
import ContactFormClient from "@/components/forms/ContactFormClient";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

const contactChannels = [
  { label: "Tournament & Community Inquiries", value: "bravoxgaming473@gmail.com", href: "mailto:bravoxgaming473@gmail.com" },
  { label: "Discord", value: "discord.gg/kHRZXbMwK5", href: BRAVO_DISCORD_URL },
  { label: "Instagram", value: "@bravo_esport", href: BRAVO_INSTAGRAM_URL },
  { label: "Sponsorship", value: "Partner replies target within 2 business days", href: "/sponsor-kit" },
] as const;

export const metadata: Metadata = buildContentMetadata({
  title: "Contact Bravo Gaming Esports",
  description:
    "Have questions about tournaments, scrims, sponsorship opportunities, or partnerships? Contact Bravo Gaming Esports and join Nepal's competitive PUBG PC community.",
  path: "/contact",
  type: "website",
});

export default function ContactPage() {
  return (
    <main className="page-shell pb-10 pt-5">
      <div className="page-stack">
        <section className="glass-panel">
          <div className="grid gap-5 xl:grid-cols-[0.78fr,1.22fr]">
            <div className="rounded-[24px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_right,rgba(20,126,245,0.16),transparent_28%),linear-gradient(180deg,rgba(16,24,43,0.95),rgba(9,15,29,0.95))] p-5">
              <p className="section-title">10. Contact Page</p>
              <h1 className="mt-3 font-display text-[2rem] font-black uppercase leading-[0.92] text-white sm:text-[2.5rem]">
                Contact Bravo
                <br />
                Gaming Esports
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-text-secondary">
                Have questions about tournaments, scrims, sponsorship opportunities, or partnerships? Get in touch
                with Bravo Gaming Esports.
              </p>

              <div className="mt-6 grid gap-3">
                {contactChannels.map((channel) => (
                  <div
                    key={channel.label}
                    className="rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">
                      {channel.label}
                    </p>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        target={channel.href.startsWith("http") ? "_blank" : undefined}
                        rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
                        className="mt-2 block text-sm text-white transition hover:text-accent-blue-light"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-white">{channel.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ContactFormClient
              kind="contact"
              title="Send Message"
              description="Use the form for tournament support, scrim participation, sponsorship opportunities, community concerns, or general platform inquiries."
              submitLabel="Send Message"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
