import { getCurrentSeasonOverview } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgDashboardData } from "@/lib/pubg-hub";
import SiteHeaderClient from "@/components/SiteHeaderClient";

type HeaderFeatureCard = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: "blue" | "red" | "yellow";
};

function formatShortDate(value?: string | null) {
  if (!value) return "Date TBA";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function toTitleCase(value?: string | null) {
  if (!value) return "Scheduled";

  return value
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SiteHeader() {
  const [hub, overview, pubg] = await Promise.all([
    getPlatformHubData().catch(() => null),
    getCurrentSeasonOverview().catch(() => null),
    getPubgDashboardData().catch(() => null),
  ]);

  const featuredEvent =
    hub?.home.featuredEvents.find((event) => event.gameSlug === "pubg-pc") ??
    hub?.events.find((event) => event.gameSlug === "pubg-pc" && (event.status === "live" || event.status === "upcoming")) ??
    hub?.home.featuredEvents[0] ??
    null;
  const topTeam = pubg?.topTeams[0] ?? pubg?.teams[0] ?? null;
  const watchLiveHref = hub?.home.liveFeature.href || "/live-stream";

  const featuredEventCard: HeaderFeatureCard = {
    eyebrow: "Featured Event",
    title: featuredEvent?.name ?? "Featured PUBG Event",
    description:
      featuredEvent?.summary ??
      "The next flagship PUBG event will appear here automatically as soon as it is published.",
    meta: featuredEvent
      ? `${toTitleCase(featuredEvent.status)} | ${formatShortDate(featuredEvent.startDate)}`
      : "PUBG event coverage",
    href: featuredEvent?.analyticsHref ?? (featuredEvent ? `/events/${featuredEvent.slug}` : "/events"),
    actionLabel: featuredEvent ? "Open Event" : "Browse Events",
    tone: "red",
  };

  const currentSeasonCard: HeaderFeatureCard = {
    eyebrow: "Current Season",
    title: overview?.season.title ?? "Current Season",
    description: overview?.currentTournament
      ? `${overview.currentTournament.title} is the active season window with standings, results, and day flow kept in sync.`
      : "Season cards stay connected to scrim days, tournament flow, and the public leaderboard.",
    meta: overview
      ? `Day ${overview.season.currentDay}/${overview.season.configuredDays} | ${overview.matchesPlayed} matches`
      : "Season archive live",
    href: overview?.season.slug ? `/pubg/seasons/${overview.season.slug}` : "/pubg/seasons/current",
    actionLabel: "Open Season",
    tone: "blue",
  };

  const topTeamCard: HeaderFeatureCard = {
    eyebrow: "Top Team",
    title: topTeam?.name ?? "Top Team",
    description: topTeam
      ? `${topTeam.formLabel} form with ${topTeam.totalPoints} total points and ${topTeam.kills} kills across the current tracked results window.`
      : "The leaderboard leader will appear here automatically once published PUBG results are available.",
    meta: topTeam ? `#1 board slot | ${topTeam.matches} matches | ${topTeam.wins} WWCD` : "PUBG flagship board",
    href: topTeam ? `/pubg/teams/${topTeam.slug ?? topTeam.id}` : "/pubg/teams",
    actionLabel: topTeam ? "Open Team" : "Browse Teams",
    tone: "yellow",
  };

  return (
    <SiteHeaderClient
      featuredEventCard={featuredEventCard}
      currentSeasonCard={currentSeasonCard}
      topTeamCard={topTeamCard}
      watchLiveHref={watchLiveHref}
    />
  );
}
