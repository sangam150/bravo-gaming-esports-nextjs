import JsonLd from "@/components/JsonLd";
import { PlatformMediaDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData, getPlatformMediaBySlug } from "@/lib/platform-hub";
import { buildBreadcrumbStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPlatformMediaBySlug(slug);

  if (!item) {
    return { title: "Media Not Found" };
  }

  return buildContentMetadata({
    title: item.title,
    description: item.summary || `View published Bravo Gaming Esports media for ${item.title}.`,
    path: `/media/${item.slug}`,
    imageUrl: item.imageUrl,
    type: "website",
  });
}

export const revalidate = 300;

export default async function MediaDetailPage({ params }: PageProps) {
  const [{ slug }, hub] = await Promise.all([params, getPlatformHubData()]);
  const item = hub.media.find((candidate) => candidate.slug === slug) ?? null;

  if (!item) {
    notFound();
  }

  const itemPath = `/media/${item.slug}`;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Media", path: "/media" },
          { name: item.title, path: itemPath },
        ])}
      />
      <PlatformMediaDetailPage hub={hub} item={item} />
    </>
  );
}
