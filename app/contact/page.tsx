import Link from "next/link";
import ContactFormClient from "@/components/forms/ContactFormClient";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";

const contactChannels = [
  { label: "Email", value: "hello@bravogamingesports.com", href: "mailto:hello@bravogamingesports.com" },
  { label: "Instagram", value: "@bravo_esport", href: BRAVO_INSTAGRAM_URL },
  { label: "Discord", value: "Official Bravo Community", href: BRAVO_DISCORD_URL },
  { label: "YouTube", value: "@bravogamingnepal7981", href: "https://www.youtube.com/@bravogamingnepal7981" },
] as const;

export default function ContactPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="glass-panel p-8">
          <div className="mb-8 max-w-3xl">
            <p className="section-title">Contact</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Reach the Bravo team</h1>
            <p className="mt-5 text-slate-300">
              Questions about registration, sponsorship, streaming, or community support can be sent directly to Bravo
              through the form below or our official public channels.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
                <p className="text-lg font-semibold text-white">Official Channels</p>
                <div className="mt-6 space-y-4 text-slate-300">
                  {contactChannels.map((channel) => (
                    <p key={channel.label}>
                      <span className="font-semibold text-white">{channel.label}:</span>{" "}
                      <a href={channel.href} target={channel.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="transition hover:text-white">
                        {channel.value}
                      </a>
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
                <p className="text-lg font-semibold text-white">Quick Actions</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                    Join Discord
                  </a>
                  <a href={BRAVO_INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                    Follow Instagram
                  </a>
                  <Link href="/pubg/community" className="btn-secondary">
                    Open Community
                  </Link>
                </div>
              </div>
            </div>

            <ContactFormClient
              kind="contact"
              title="Send a message"
              description="Use this form for partnerships, registration questions, platform issues, or support requests."
              submitLabel="Send Message"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
