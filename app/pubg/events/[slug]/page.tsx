import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PubgEventDetailPage } from "@/components/pubg/PubgPublicPages";
import { getPubgEventBySlug, getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPubgEventBySlug(slug);

  if (!event) {
    return { title: "PUBG Event Not Found" };
  }

  return {
    title: `${event.name} Event`,
    description: `Track ${event.name} on Bravo with standings, player stats, match lists, map splits, and approval state.`,
  };
}

export const revalidate = 300;

export default async function PubgEventDetailRoute({ params, searchParams }: PageProps) {
  const [{ slug }, resolvedSearchParams, dataset] = await Promise.all([params, searchParams, getPubgHubDataset()]);
  const event = dataset.events.find((item) => item.slug === slug) ?? null;

  if (!event) {
    notFound();
  }

  return <PubgEventDetailPage dataset={dataset} event={event} searchParams={resolvedSearchParams} />;
}
