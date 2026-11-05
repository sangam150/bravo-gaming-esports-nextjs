import BroadcastOverlay from "@/components/broadcast/BroadcastOverlay";
import { isBroadcastGraphic } from "@/lib/broadcast";
import { notFound } from "next/navigation";

export const metadata = { title: "OBS Broadcast | Bravo Gaming", robots: { index: false, follow: false } };

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ graphic: string }>;
  searchParams: Promise<{ preview?: string; studio?: string }>;
}) {
  const { graphic } = await params;
  if (graphic !== "program" && !isBroadcastGraphic(graphic)) notFound();
  const query = await searchParams;
  return <BroadcastOverlay graphic={graphic} preview={query.preview === "1"} studio={query.studio === "1"} />;
}
