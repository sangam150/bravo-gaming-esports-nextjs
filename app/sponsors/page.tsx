import type { Metadata } from "next";
import { PlatformSponsorsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Bravo Gaming Esports sponsor hub with sponsor, partner, and design profiles, event links, and managed public asset support.",
};

export const revalidate = 300;

export default async function SponsorsPage() {
  const hub = await getPlatformHubData();
  return <PlatformSponsorsPage hub={hub} />;
}
