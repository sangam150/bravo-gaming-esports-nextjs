import AdminDashboard from "@/components/admin/AdminDashboard";
import type { AdminSection } from "@/components/admin/AdminSidebar";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ section: string }>;
};

const SECTION_BY_ROUTE = {
  homepage: "homepage",
  news: "news",
  games: "games",
  announcements: "announcements",
  teams: "teams",
  "registered-teams": "registeredTeams",
  players: "players",
  "player-team-linking": "playerTeamLinking",
  "events-hub": "platformEvents",
  tournaments: "tournaments",
  seasons: "seasons",
  scrims: "scrims",
  "match-manager": "matchManager",
  "pubg-import": "pubg",
  "pending-imports": "pendingImports",
  "import-history": "approvedImports",
  statistics: "matches",
  leaderboards: "leaderboard",
  registrations: "registrations",
  sponsors: "sponsors",
  media: "media",
  "hero-slides": "homepage",
  footer: "footer",
  settings: "settings",
  messages: "inbox",
  "team-requests": "teamRequests",
  "discord-role-mappings": "discordRoles",
} as const satisfies Record<string, AdminSection>;

export default async function AdminNamedSectionPage({ params }: PageProps) {
  const { section } = await params;
  const initialSection = SECTION_BY_ROUTE[section as keyof typeof SECTION_BY_ROUTE];

  if (!initialSection) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AdminDashboard initialSection={initialSection} />
    </main>
  );
}
