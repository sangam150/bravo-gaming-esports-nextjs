"use client";

import Link from "next/link";

export default function PubgTeamDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell">
      <div className="page-inner flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="section-title">Server Error</p>
        <h1 className="hero-h1 mt-2 !text-4xl">This team profile could not be loaded</h1>
        <p className="mt-4 max-w-xl text-text-muted">
          Something went wrong while loading this team profile. Please try again shortly or return to the team directory.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/pubg/teams" className="btn-secondary">
            Open Teams
          </Link>
        </div>
      </div>
    </main>
  );
}
