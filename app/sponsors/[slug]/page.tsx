import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformSponsorDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData, getPlatformSponsorBySlug } from "@/lib/platform-hub";

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
    description: sponsor.description,
    path: `/sponsors/${sponsor.slug}`,
    imageUrl: sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl,
  });
}

export const revalidate = 300;

export default async function SponsorDetailPage({ params }: PageProps) {
  const [{ slug }, hub] = await Promise.all([params, getPlatformHubData()]);
  const sponsor = hub.sponsors.find((item) => item.slug === slug) ?? null;

  if (!sponsor) {
    notFound();
  }

  return <PlatformSponsorDetailPage hub={hub} sponsor={sponsor} />;
}
