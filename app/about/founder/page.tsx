import Link from "next/link";

import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildContentMetadata({
    title: "Founder | Bravo Gaming Esports",
    description: "Read about the leadership focus and competition values presented by Bravo Gaming Esports.",
    path: "/about/founder",
    type: "website",
  }),
  robots: {
    index: false,
    follow: true,
  },
};

export default function FounderPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">About</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Founder</h1>
            <p className="mt-5 max-w-3xl text-slate-300">
              Learn about the founder behind Bravo Gaming Esports and the vision driving Nepal’s competitive PUBG community.
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
            <p className="text-lg font-semibold text-white">Visionary leadership</p>
            <p className="mt-3 text-slate-300">
              The Bravo founder is focused on building structured esports pathways and delivering top-level live event production.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">What matters</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Fair competitive environments.</li>
              <li>• Professional broadcast readiness.</li>
              <li>• Community-first growth.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
