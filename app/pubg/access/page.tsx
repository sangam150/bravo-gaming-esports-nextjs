import { PubgAccessPage } from "@/components/pubg/PubgPublicPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PUBG Access",
  description: "Bravo PUBG access page for Supabase admin and team login routes.",
};

export const revalidate = 300;

export default function PubgAccessIndexPage() {
  return <PubgAccessPage />;
}
