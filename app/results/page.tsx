import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = buildContentMetadata({
  title: "Results | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports match results, standings, and recent competition outcomes.",
  path: "/results",
  type: "website",
});

export default async function ResultsPage() {
  redirect("/pubg/results");
}
