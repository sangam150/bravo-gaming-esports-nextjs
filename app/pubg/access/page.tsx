import type { Metadata } from "next";
import { PubgAccessPage } from "@/components/pubg/PubgPublicPages";

export const metadata: Metadata = {
  title: "PUBG Access",
  description: "Bravo PUBG access page for Admin Login, Team IGL Login, and future player, coach, and caster roles.",
};

export const revalidate = 300;

export default function PubgAccessIndexPage() {
  return <PubgAccessPage />;
}
