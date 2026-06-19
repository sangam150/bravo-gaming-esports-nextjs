import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CurrentSeasonPageClient from "@/components/current-season/CurrentSeasonPageClient";
import { getCurrentSeasonOverview, getSeasonOverviewBySlug } from "@/lib/data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveSeasonOverview(slug: string) {
  return slug.trim().toLowerCase() === "current" ? getCurrentSeasonOverview() : getSeasonOverviewBySlug(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const overview = await resolveSeasonOverview(slug);

  if (!overview) {
    return { title: "Season Not Found" };
  }

  return {
    title: overview.season.seriesTitle,
    description: `Follow ${overview.season.seriesTitle} with standings, day flow, registered teams, match totals, and published season history.`,
  };
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
