import type { Metadata } from "next";
import { PlatformDashboardIndexPage } from "@/components/platform/PlatformPages";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Bravo Gaming Esports dashboard index for Supabase admin, team, and player access.",
};

export const revalidate = 300;

export default function DashboardPage() {
  return <PlatformDashboardIndexPage />;
}
