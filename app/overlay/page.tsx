import type { Metadata } from "next";
import BroadcastOverlay from "./BroadcastOverlay";

export const metadata: Metadata = {
  title: "Broadcast Overlay | Bravo Gaming Esports",
  robots: { index: false, follow: false },
};

export default function BroadcastOverlayPage() {
  return <BroadcastOverlay />;
}
