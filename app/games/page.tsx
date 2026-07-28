import { PlatformGamesPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Games | Bravo Gaming Esports",
  description: "Browse game hubs currently published by Bravo Gaming Esports.",
  path: "/games",
  type: "website",
});

export const revalidate = 300;

export default async function GamesPage() {
  const hub = await getPlatformHubData();
  return <PlatformGamesPage hub={hub} />;
}
