import { PlatformOrganizationsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizations",
  description: "Browse Bravo Gaming Esports organizations, ecosystem operators, and future partner organizer profiles.",
};

export const revalidate = 300;

export default async function OrganizationsPage() {
  const hub = await getPlatformHubData();
  return <PlatformOrganizationsPage hub={hub} />;
}
