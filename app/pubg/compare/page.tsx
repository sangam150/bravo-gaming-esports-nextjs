import ComparePageLoader from "@/components/pubg/ComparePageLoader";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "PUBG Compare",
  description: "Side-by-side Bravo PUBG compare studio for teams and players with radar, trend overlays, and map edge.",
};

export const revalidate = 300;

export default async function PubgComparePage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);

  return (
    <ComparePageLoader
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
