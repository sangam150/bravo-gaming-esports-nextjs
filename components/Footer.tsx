import Link from "next/link";
import BravoLogo from "@/components/ui/BravoLogo";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/[0.08] bg-bg-primary px-4 py-10 sm:px-6 lg:px-8">
      <div className="page-inner">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <BravoLogo size={36} />
              <p className="font-display text-sm font-bold uppercase text-white">Bravo Gaming Esports</p>
            </div>
            <p className="mt-3 text-sm text-text-muted">Nepal&apos;s premium PUBG PC esports portal.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { title: "Platform", links: [["Home", "/"], ["Scrims", "/pubg-scrims"], ["Tournaments", "/tournaments"]] },
              { title: "Compete", links: [["Leaderboard", "/leaderboard"], ["Teams", "/teams"], ["Players", "/players"]] },
              { title: "Live", links: [["Stream", "/live-stream"], ["Videos", "/videos"], ["News", "/news"]] },
              { title: "About", links: [["About", "/about"], ["Community", "/community"], ["Admin", "/admin"]] },
            ].map((column) => (
              <div key={column.title}>
                <p className="text-label font-bold uppercase text-text-muted">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-text-muted hover:text-accent-blue">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-text-muted">Copyright 2026 Bravo Gaming Esports Nepal</p>
      </div>
    </footer>
  );
}
