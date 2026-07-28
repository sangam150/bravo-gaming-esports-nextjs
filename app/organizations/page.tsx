import { PlatformOrganizationsPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Organizations | Bravo Gaming Esports",
  description: "Browse esports organization profiles published by Bravo Gaming Esports.",
  path: "/organizations",
  type: "website",
});

export const revalidate = 300;

export default async function OrganizationsPage() {
  const hub = await getPlatformHubData();
  return <PlatformOrganizationsPage hub={hub} />;
}
