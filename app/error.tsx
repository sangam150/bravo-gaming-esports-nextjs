"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="section-title">Server Error</p>
      <h1 className="hero-h1 mt-2 !text-4xl">Something went wrong on our end</h1>
      <p className="mt-4 max-w-xl text-text-muted">
        Please refresh the page or try again shortly. The platform will continue to show published data as soon as this page recovers.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">
          Try Again
        </button>
        <Link href="/" className="btn-secondary">
          Go Home
        </Link>
      </div>
    </main>
  );
}
