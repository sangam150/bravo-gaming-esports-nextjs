import Link from "next/link";

const sections = [
  {
    title: "Platform Use",
    detail:
      "Bravo Gaming Esports publishes public esports coverage, rankings, event information, media, and community resources. Users are expected to use the platform lawfully and respectfully.",
  },
  {
    title: "Competition Data",
    detail:
      "Event standings, match results, player output, and team statistics may be published only after admin review or approved imports. Bravo may correct, update, or unpublish data when needed.",
  },
  {
    title: "Accounts And Access",
    detail:
      "Super admin, admin, team manager / IGL, and player accounts are controlled through Supabase Auth with role-based access checks. Unauthorized access attempts may be blocked.",
  },
  {
    title: "Content And Media",
    detail:
      "Uploaded logos, banners, posters, screenshots, and media are expected to belong to the submitting organization or be used with permission. Bravo may remove infringing or abusive content.",
  },
];

export default function TermsPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="esports-card p-6 sm:p-8">
          <p className="section-title">Terms</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-5xl">
            Bravo Gaming Esports terms of use
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted">
            These terms explain how Bravo Gaming Esports surfaces competition data, platform content, role-based access,
            and uploads across the public hub.
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
            <Link href="/privacy" className="btn-secondary">
              Privacy Policy
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
