import CurrentSeasonPageClient from "@/components/current-season/CurrentSeasonPageClient";
import { getCurrentSeasonOverview, getSeasonOverviewBySlug } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveSeasonOverview(slug: string) {
  try {
    return slug.trim().toLowerCase() === "current" ? await getCurrentSeasonOverview() : await getSeasonOverviewBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const overview = await resolveSeasonOverview(slug);

  if (!overview) {
    return { title: "Season Not Found" };
  }

  return buildContentMetadata({
    title: `${overview.season.seriesTitle} | Bravo Gaming Esports`,
    description: `Follow ${overview.season.seriesTitle} with standings, day flow, registered teams, match totals, and published season history.`,
    path: `/pubg/seasons/${overview.season.slug}`,
    type: "website",
  });
}

export const revalidate = 300;

export default async function PubgSeasonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const overview = await resolveSeasonOverview(slug);

  if (!overview) {
    notFound();
  }

  if (slug.trim().toLowerCase() === "current") {
    redirect(`/pubg/seasons/${overview.season.slug}`);
  }

  if (slug !== overview.season.slug) {
    redirect(`/pubg/seasons/${overview.season.slug}`);
  }

  return <CurrentSeasonPageClient initialOverview={overview} enableRealtime={overview.season.status === "active"} />;
}
