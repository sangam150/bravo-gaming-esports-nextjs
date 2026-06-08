import Link from "next/link";
import BravoLogo from "@/components/ui/BravoLogo";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/[0.08] bg-bg-primary px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
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
              { t: "Platform", links: [["Home", "/"], ["Scrims", "/pubg-scrims"], ["Tournaments", "/tournaments"]] },
              { t: "Compete", links: [["Leaderboard", "/leaderboard"], ["Teams", "/teams"], ["Players", "/players"]] },
              { t: "Live", links: [["Stream", "/live-stream"], ["Videos", "/videos"], ["News", "/news"]] },
              { t: "About", links: [["About", "/about"], ["Community", "/community"], ["Admin", "/admin"]] },
            ].map((col) => (
              <div key={col.t}>
                <p className="text-label font-bold uppercase text-text-muted">{col.t}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([l, h]) => (
                    <li key={h}><Link href={h} className="text-sm text-text-muted hover:text-accent-blue">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-text-muted">© 2026 Bravo Gaming Esports Nepal</p>
      </div>
    </footer>
  );
}
