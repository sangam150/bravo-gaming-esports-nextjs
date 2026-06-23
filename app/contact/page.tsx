import ContactFormClient from "@/components/forms/ContactFormClient";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";

const contactChannels = [
  { label: "Email", value: "hello@bravogamingesports.com", href: "mailto:hello@bravogamingesports.com" },
  { label: "Discord", value: "discord.gg/kHRZXbMwK5", href: BRAVO_DISCORD_URL },
  { label: "Instagram", value: "@bravo_esport", href: BRAVO_INSTAGRAM_URL },
  { label: "Location", value: "Kathmandu, Nepal", href: "" },
] as const;

export default function ContactPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="glass-panel">
          <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
            <div className="rounded-[24px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_right,rgba(20,126,245,0.16),transparent_28%),linear-gradient(180deg,rgba(16,24,43,0.95),rgba(9,15,29,0.95))] p-5">
              <p className="section-title">10. Contact Page</p>
              <h1 className="mt-4 font-display text-[2rem] font-black uppercase leading-[0.92] text-white sm:text-[2.6rem]">
                Contact Us
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-text-secondary">
                Have questions, partnership ideas, or registration issues? Reach the Bravo team through the official channels below or send a message directly.
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
                        rel="noreferrer"
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
              description="Use the form for partnerships, registration support, event questions, or general Bravo platform contact."
              submitLabel="Send Message"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
