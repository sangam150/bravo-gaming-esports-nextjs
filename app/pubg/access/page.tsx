import { PubgAccessPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildContentMetadata({
    title: "PUBG Account Access | Bravo Gaming Esports",
    description: "Open the official Bravo Gaming Esports sign-in routes for authorized platform users.",
    path: "/pubg/access",
    type: "website",
  }),
  robots: {
    index: false,
    follow: true,
  },
};

export const revalidate = 300;

export default function PubgAccessIndexPage() {
  return <PubgAccessPage />;
}
