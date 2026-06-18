import type { Metadata } from "next";
import { PlatformCalendarPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Bravo Gaming Esports calendar for tournaments, scrims, schedules, matches, and community event timing.",
};

export const revalidate = 300;

export default async function CalendarPage() {
  const hub = await getPlatformHubData();
  return <PlatformCalendarPage hub={hub} />;
}
