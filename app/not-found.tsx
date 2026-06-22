import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="section-title">404</p>
      <h1 className="hero-h1 mt-2 !text-4xl">Page Not Found</h1>
      <p className="mt-4 max-w-xl text-text-muted">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
        <Link href="/pubg" className="btn-secondary">
          Open PUBG Hub
        </Link>
      </div>
    </main>
  );
}
