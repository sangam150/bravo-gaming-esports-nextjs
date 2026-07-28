import { PlatformCalendarPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Esports Calendar | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports event, scrim, match, and broadcast dates.",
  path: "/calendar",
  type: "website",
});

export const revalidate = 300;

export default async function CalendarPage() {
  const hub = await getPlatformHubData();
  return <PlatformCalendarPage hub={hub} />;
}
