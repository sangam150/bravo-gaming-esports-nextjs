import JsonLd from "@/components/JsonLd";
import { PlatformSponsorDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData, getPlatformSponsorBySlug } from "@/lib/platform-hub";
import { resolveSponsorHeroUrl } from "@/lib/public-asset-url";
import { isSponsorSlugAlias, resolveCanonicalSponsorSlug } from "@/lib/sponsor-links";
import { buildBreadcrumbStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sponsor = await getPlatformSponsorBySlug(slug);

  if (!sponsor) {
    return { title: "Sponsor Not Found" };
  }

  return buildContentMetadata({
    title: sponsor.name,
    description: sponsor.description || `View the published sponsor profile for ${sponsor.name}.`,
    path: `/sponsors/${sponsor.slug}`,
    imageUrl: resolveSponsorHeroUrl(sponsor) ?? undefined,
    type: "website",
  });
}

export const revalidate = 300;

export default async function SponsorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (isSponsorSlugAlias(slug)) {
    permanentRedirect(`/sponsors/${resolveCanonicalSponsorSlug(slug)}`);
  }

  const hub = await getPlatformHubData();
  const sponsor = hub.sponsors.find((item) => item.slug === resolveCanonicalSponsorSlug(slug)) ?? null;

  if (!sponsor) {
    notFound();
  }

  const sponsorPath = `/sponsors/${sponsor.slug}`;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Sponsors", path: "/sponsors" },
          { name: sponsor.name, path: sponsorPath },
        ])}
      />
      <PlatformSponsorDetailPage hub={hub} sponsor={sponsor} />
    </>
  );
}
