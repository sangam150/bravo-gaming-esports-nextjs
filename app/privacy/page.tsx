import Link from "next/link";

const sections = [
  {
    title: "Information We Store",
    detail:
      "Bravo may store contact form submissions, team account information, upload metadata, published competition data, and role-based access details required to run the platform.",
  },
  {
    title: "Supabase Services",
    detail:
      "Authentication, database records, storage uploads, and approved public data are managed through Supabase-backed services used by the Bravo platform.",
  },
  {
    title: "Public Versus Private Data",
    detail:
      "Published events, match results, teams, players, sponsors, media, and news may appear publicly. Draft, pending, and role-restricted records should remain hidden from public pages.",
  },
  {
    title: "Contact And Review",
    detail:
      "If you need a correction to a public profile, upload, or event record, use the public contact route or the appropriate team/admin workflow so the Bravo staff can review it.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="esports-card p-6 sm:p-8">
          <p className="section-title">Privacy</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-5xl">
            Bravo Gaming Esports privacy policy
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted">
            This page explains the main privacy expectations for Bravo account access, public publishing, uploads, and
            contact flows.
          </p>
          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[24px] border border-white/[0.08] bg-bg-primary p-5">
                <h2 className="font-display text-xl font-black uppercase text-white">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">{section.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/terms" className="btn-secondary">
              Terms Of Use
            </Link>
            <Link href="/contact" className="btn-primary">
              Contact Bravo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
