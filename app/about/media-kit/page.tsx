import Link from "next/link";

import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildContentMetadata({
    title: "Media Kit | Bravo Gaming Esports",
    description: "Review the media and brand asset information currently published by Bravo Gaming Esports.",
    path: "/about/media-kit",
    type: "website",
  }),
  robots: {
    index: false,
    follow: true,
  },
};

export default function MediaKitPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">About</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Media Kit</h1>
            <p className="mt-5 max-w-3xl text-slate-300">
              Download sponsor assets, branding guidelines, and media resources for Bravo Gaming Esports coverage.
            </p>
          </div>
          <Link
            href="/about"
            className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Back to About
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Brand assets</p>
            <p className="mt-3 text-slate-300">
              Everything sponsors and media partners need for polished event promotion and broadcast integration.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Included files</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Logo pack and profile graphics.</li>
              <li>• Event sponsor badges.</li>
              <li>• Production and stream branding guides.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
