import { PlatformSponsorDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData, getPlatformSponsorBySlug } from "@/lib/platform-hub";
import { isSponsorSlugAlias, resolveCanonicalSponsorSlug } from "@/lib/sponsor-links";
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
    imageUrl: sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl,
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

  return <PlatformSponsorDetailPage hub={hub} sponsor={sponsor} />;
}
