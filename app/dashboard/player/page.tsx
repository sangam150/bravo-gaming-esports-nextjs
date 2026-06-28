import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Redirect",
  description: "Bravo Gaming Esports uses admin login and team login only.",
};

export const revalidate = 300;

export default async function PlayerDashboardPage() {
  redirect("/login");
}
