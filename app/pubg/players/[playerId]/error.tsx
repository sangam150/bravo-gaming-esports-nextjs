"use client";

import Link from "next/link";

export default function PubgPlayerDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell">
      <div className="page-inner flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="section-title">Server Error</p>
        <h1 className="hero-h1 mt-2 !text-4xl">This player profile could not be loaded</h1>
        <p className="mt-4 max-w-xl text-text-muted">
          Something went wrong while loading this player profile. Please try again shortly or return to the player directory.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/pubg/players" className="btn-secondary">
            Open Players
          </Link>
        </div>
      </div>
    </main>
  );
}
