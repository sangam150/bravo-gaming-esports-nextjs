"use client";

import Link from "next/link";

export default function PubgEventDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell">
      <div className="page-inner flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="section-title">Server Error</p>
        <h1 className="hero-h1 mt-2 !text-4xl">This event page could not be loaded</h1>
        <p className="mt-4 max-w-xl text-text-muted">
          Something went wrong while loading this event. Please try again shortly or return to the published events board.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/pubg/events" className="btn-secondary">
            Open Events
          </Link>
        </div>
      </div>
    </main>
  );
}
