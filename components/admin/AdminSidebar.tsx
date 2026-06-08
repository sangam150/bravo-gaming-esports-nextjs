"use client";

import BravoLogo from "@/components/ui/BravoLogo";

const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "teams", label: "Teams" },
  { id: "players", label: "Players" },
  { id: "scrims", label: "Scrims" },
  { id: "matches", label: "Matches" },
  { id: "tournaments", label: "Tournaments" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "announcements", label: "Announcements" },
  { id: "registrations", label: "Registrations" },
  { id: "pubg", label: "Live Import" },
  { id: "settings", label: "Settings" },
] as const;

export type AdminSection = (typeof sections)[number]["id"];

export default function AdminSidebar({
  active,
  onChange,
  firebaseConnected,
  onLogout,
  adminEmail,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  firebaseConnected: boolean;
  onLogout?: () => void;
  adminEmail?: string;
}) {
  return (
    <aside className="esports-card flex w-full flex-col p-4 lg:sticky lg:top-20 lg:w-56 lg:shrink-0">
      <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-4">
        <BravoLogo size={36} />
        <div>
          <p className="font-display text-xs font-bold uppercase text-white">Bravo Gaming</p>
          <p className="text-[10px] uppercase text-text-muted">Dashboard</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`rounded-btn px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition ${
              active === section.id
                ? "bg-accent-blue text-white"
                : "text-text-muted hover:bg-bg-hover hover:text-white"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-3 border-t border-white/[0.08] pt-4">
        {adminEmail && <p className="truncate text-[10px] text-text-muted">{adminEmail}</p>}
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${firebaseConnected ? "bg-accent-green" : "bg-accent-yellow"}`} />
          {firebaseConnected ? "Firebase connected" : "Seed data mode"}
        </div>
        {onLogout && (
          <button type="button" onClick={onLogout} className="w-full rounded-btn border border-white/10 px-3 py-2 text-left text-[10px] font-bold uppercase text-text-muted hover:bg-bg-hover hover:text-white">
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
