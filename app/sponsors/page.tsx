import Link from "next/link";
import { getSponsors } from "@/lib/data";

const tierPriority = ["Title Sponsor", "Platinum Sponsor", "Gold Sponsor", "Silver Sponsor", "Community Partner"];

function sortSponsors(
  firstSponsor: Awaited<ReturnType<typeof getSponsors>>[number],
  secondSponsor: Awaited<ReturnType<typeof getSponsors>>[number]
) {
  const firstTierIndex = tierPriority.indexOf(firstSponsor.tier);
  const secondTierIndex = tierPriority.indexOf(secondSponsor.tier);

  return (
    (firstTierIndex === -1 ? Number.POSITIVE_INFINITY : firstTierIndex) -
      (secondTierIndex === -1 ? Number.POSITIVE_INFINITY : secondTierIndex) ||
    firstSponsor.tier.localeCompare(secondSponsor.tier) ||
    firstSponsor.name.localeCompare(secondSponsor.name)
  );
}

export default async function SponsorsPage() {
  const sponsors = (await getSponsors()).sort(sortSponsors);

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="page-hero p-8">
          <p className="section-title">Sponsors & Partners</p>
          <h1 className="hero-h1 mt-2 !text-4xl">Brand Allies</h1>
          <p className="mt-4 max-w-3xl text-sm text-text-muted sm:text-base">
            Sponsor placements are published from the Bravo sponsor directory so the page only shows approved, real partner content.
          </p>
        </section>

        {sponsors.length === 0 ? (
          <section className="esports-card mt-8 p-10 text-center">
            <p className="font-display text-lg font-bold uppercase text-white">Sponsor content not published yet</p>
            <p className="mt-2 text-sm text-text-muted">
              Publish sponsor entries to show real partner logos, tiers, and links across the platform.
            </p>
            <Link href="/about/sponsor-us" className="btn-primary mt-6 inline-flex">
              Sponsor Us
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sponsors.map((sponsor) => (
              <article key={sponsor.id} className="esports-card p-6">
                <p className="text-label uppercase text-accent-blue">{sponsor.tier}</p>
                <h2 className="mt-3 font-display text-xl font-bold uppercase text-white">{sponsor.name}</h2>
                <p className="mt-3 text-sm text-text-muted">
                  Approved partner content published from the Bravo sponsor directory.
                </p>
                {sponsor.url ? (
                  <a
                    href={sponsor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline-blue mt-5 inline-flex"
                  >
                    Visit Partner
                  </a>
                ) : null}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
