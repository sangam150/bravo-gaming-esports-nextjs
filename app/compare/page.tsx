import type { Metadata } from "next";
import ComparePageClient from "@/components/pubg/ComparePageClient";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare Bravo PUBG teams and players side-by-side with radar, trends, map edge, and recent form.",
};

export const revalidate = 300;

export default async function ComparePage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);

  return (
    <ComparePageClient
      dataset={dataset}
      initialMode={(pickParam(resolvedSearchParams, "mode") as "teams" | "players" | undefined) ?? "teams"}
      initialSideA={pickParam(resolvedSearchParams, "sideA")}
      initialSideB={pickParam(resolvedSearchParams, "sideB")}
      initialEvent={pickParam(resolvedSearchParams, "event")}
      initialMap={pickParam(resolvedSearchParams, "map")}
      initialWindow={(pickParam(resolvedSearchParams, "window") as "7" | "30" | "all" | undefined) ?? "30"}
    />
  );
}
