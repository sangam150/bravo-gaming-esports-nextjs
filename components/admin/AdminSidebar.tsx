"use client";

import BravoLogo from "@/components/ui/BravoLogo";

const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "homepage", label: "Homepage" },
  { id: "footer", label: "Footer" },
  { id: "games", label: "Games" },
  { id: "platformEvents", label: "Events Hub" },
  { id: "news", label: "News CMS" },
  { id: "media", label: "Media" },
  { id: "sponsors", label: "Sponsors" },
  { id: "inbox", label: "Inbox" },
  { id: "teamRequests", label: "Team Requests" },
  { id: "discordRoles", label: "Discord Roles" },
  { id: "seasons", label: "Seasons" },
  { id: "scrims", label: "Days" },
  { id: "pendingImports", label: "Pending Imports" },
  { id: "approvedImports", label: "Approved Imports" },
  { id: "pubg", label: "PUBG Import" },
  { id: "matchManager", label: "Match Manager" },
  { id: "teams", label: "Teams" },
  { id: "registeredTeams", label: "Registered Teams" },
  { id: "players", label: "Players" },
  { id: "tournaments", label: "Tournaments" },
  { id: "leaderboard", label: "Leaderboards" },
  { id: "matches", label: "Statistics" },
  { id: "announcements", label: "Announcements" },
  { id: "registrations", label: "Registrations" },
  { id: "settings", label: "Settings" },
] as const;

export type AdminSection = (typeof sections)[number]["id"];

export default function AdminSidebar({
  active,
  onChange,
  dataConnected,
  dataBackend,
  onLogout,
  adminEmail,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  dataConnected: boolean;
  dataBackend?: string | null;
  onLogout?: () => void;
  adminEmail?: string;
}) {
  const backendLabel = dataBackend ? `${dataBackend[0].toUpperCase()}${dataBackend.slice(1)} data connected` : null;

  return (
    <aside className="esports-card flex w-full flex-col gap-4 p-4 xl:sticky xl:top-20 xl:w-56 xl:shrink-0">
      <div className="mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-4">
        <BravoLogo size={36} />
        <div>
          <p className="font-display text-xs font-bold uppercase text-white">Bravo Gaming</p>
          <p className="text-[10px] uppercase text-text-muted">Dashboard</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto xl:flex-col xl:gap-0.5 xl:overflow-visible">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`shrink-0 rounded-btn px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition ${
              active === section.id ? "bg-accent-blue text-white" : "text-text-muted hover:bg-bg-hover hover:text-white"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="space-y-3 border-t border-white/[0.08] pt-4 xl:mt-auto">
        {adminEmail && <p className="truncate text-[10px] text-text-muted">{adminEmail}</p>}
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${dataConnected ? "bg-accent-green" : "bg-accent-yellow"}`} />
          {dataConnected ? (backendLabel ?? "Live data connected") : "Seed data mode"}
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-btn border border-white/10 px-3 py-2 text-left text-[10px] font-bold uppercase text-text-muted hover:bg-bg-hover hover:text-white"
          >
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
