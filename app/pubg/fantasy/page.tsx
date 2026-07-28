import { PubgFantasyPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildContentMetadata({
    title: "PUBG Fantasy | Bravo Gaming Esports",
    description: "Review the current Bravo PUBG fantasy feature status.",
    path: "/pubg/fantasy",
    type: "website",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 300;

export default function PubgFantasyIndexPage() {
  return <PubgFantasyPage />;
}
