import type { Metadata } from "next";
import { PlatformSponsorsPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = buildContentMetadata({
  title: "Sponsors | Bravo Gaming Esports",
  description: "Explore Bravo Gaming Esports sponsor, partner, and design profiles with event context and inquiry routes.",
  path: "/sponsors",
  type: "website",
});

export const revalidate = 300;

export default async function SponsorsPage() {
  const hub = await getPlatformHubData();
  return <PlatformSponsorsPage hub={hub} />;
}
