import Link from "next/link";

export default function PubgSeasonDetailNotFound() {
  return (
    <main className="page-shell">
      <div className="page-inner flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="section-title">Season Not Found</p>
        <h1 className="hero-h1 mt-2 !text-4xl">This season is unavailable</h1>
        <p className="mt-4 max-w-xl text-text-muted">The page you are looking for does not exist or may have been moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/pubg" className="btn-primary">
            Open PUBG Hub
          </Link>
          <Link href="/events" className="btn-secondary">
            Browse Events
          </Link>
        </div>
      </div>
    </main>
  );
}
