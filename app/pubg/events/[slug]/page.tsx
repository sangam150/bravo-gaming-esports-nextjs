import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PubgEventDetailPage } from "@/components/pubg/PubgPublicPages";
import { getPubgEventBySlug, getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveEvent(slug: string) {
  try {
    return await getPubgEventBySlug(slug);
  } catch {
    return null;
  }
}

async function resolveEventDataset(slug: string) {
  try {
    const dataset = await getPubgHubDataset();
    const event = dataset.events.find((item) => item.slug === slug) ?? null;
    return { dataset, event };
  } catch {
    return { dataset: null, event: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await resolveEvent(slug);

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
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { dataset, event } = await resolveEventDataset(slug);

  if (!dataset || !event) {
    notFound();
  }

  return <PubgEventDetailPage dataset={dataset} event={event} searchParams={resolvedSearchParams} />;
}
