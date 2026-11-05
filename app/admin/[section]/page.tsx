import AdminDashboard from "@/components/admin/AdminDashboard";
import type { AdminSection } from "@/components/admin/AdminSidebar";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { ADMIN_SECTION_ROUTES, getAdminSectionHref, getAdminWorkspace } from "@/lib/admin-navigation";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ view?: string; competition?: string }>;
};

const SECTION_BY_ROUTE = {
  competitions: "tournaments",
  "teams-players": "teams",
  "match-results": "matchManager",
  content: "news",
  homepage: "homepage",
  broadcast: "broadcast",
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

export default async function AdminNamedSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params;
  let initialSection: AdminSection = SECTION_BY_ROUTE[section as keyof typeof SECTION_BY_ROUTE];

  if (!initialSection) {
    notFound();
  }
  const query = await searchParams;
  if (
    query.view &&
    Object.hasOwn(ADMIN_SECTION_ROUTES, query.view) &&
    getAdminWorkspace(query.view as AdminSection).id === getAdminWorkspace(initialSection).id
  )
    initialSection = query.view as AdminSection;
  const href = getAdminSectionHref(initialSection);
  if (section !== ADMIN_SECTION_ROUTES[initialSection]) {
    redirect(`${href}${query.competition ? `${href.includes("?") ? "&" : "?"}competition=${encodeURIComponent(query.competition)}` : ""}`);
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AdminDashboard initialSection={initialSection} initialCompetitionId={query.competition} />
    </main>
  );
}
