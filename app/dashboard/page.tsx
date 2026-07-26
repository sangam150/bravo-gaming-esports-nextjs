import { PlatformDashboardIndexPage } from "@/components/platform/PlatformPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Bravo Gaming Esports dashboard index for Supabase admin and team access.",
};

export const revalidate = 300;

export default function DashboardPage() {
  return <PlatformDashboardIndexPage />;
}
