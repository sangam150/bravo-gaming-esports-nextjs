import Link from "next/link";
import ContactFormClient from "@/components/forms/ContactFormClient";

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Community</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Feedback</h1>
            <p className="mt-5 max-w-3xl text-slate-300">
              Share your thoughts on Bravo tournaments, stream production, and community events to help us build the
              best esports experience.
            </p>
          </div>
          <Link
            href="/contact"
            className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Contact support
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Your voice</p>
            <p className="mt-3 text-slate-300">
              We welcome player feedback to improve rules, scheduling, and the event experience.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">What to share</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>Match result reviews.</li>
              <li>Community event ideas.</li>
              <li>Broadcast and stream quality feedback.</li>
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <ContactFormClient
            kind="feedback"
            title="Send feedback"
            description="Share match review notes, event ideas, or broadcast feedback directly with the Bravo team."
            submitLabel="Send Feedback"
            subjectLabel="Topic"
          />
        </div>
      </section>
    </main>
  );
}
