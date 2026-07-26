"use client";

import type { PubgHubDataset } from "@/lib/pubg-hub";
import dynamic from "next/dynamic";

const ComparePageClient = dynamic(() => import("./ComparePageClient"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8" role="status" aria-live="polite">
      <div className="h-56 animate-pulse rounded-[28px] border border-white/[0.08] bg-white/[0.03]" />
      <span className="sr-only">Loading comparison studio</span>
    </div>
  ),
});

type ComparePageLoaderProps = {
  dataset: PubgHubDataset;
  initialEvent?: string;
  initialMap?: string;
  initialMode?: "teams" | "players";
  initialSideA?: string;
  initialSideB?: string;
  initialWindow?: "7" | "30" | "all";
};

export default function ComparePageLoader(props: ComparePageLoaderProps) {
  return <ComparePageClient {...props} />;
}
