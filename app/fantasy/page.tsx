import { PlatformFantasyPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildContentMetadata({
    title: "Fantasy | Bravo Gaming Esports",
    description: "Review the current Bravo Gaming Esports fantasy feature status.",
    path: "/fantasy",
    type: "website",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 300;

export default function FantasyPage() {
  return <PlatformFantasyPage />;
}
