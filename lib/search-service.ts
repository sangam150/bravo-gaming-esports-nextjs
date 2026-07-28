import { getSeasons } from "./data";
import { getPlatformHubData } from "./platform-hub";
import { getPubgHubDataset } from "./pubg-hub";
import { getCanonicalPublicEventHref } from "./public-links";

type SearchResultKind = "team" | "player" | "event" | "match" | "season" | "news" | "sponsor" | "media";

interface SearchResultItem {
  kind: SearchResultKind;
  title: string;
  href: string;
  description: string;
  subtitle: string;
  badge: string;
  score: number;
  searchText: string;
}

interface SearchResultGroup {
  kind: SearchResultKind;
  label: string;
  items: SearchResultItem[];
  count: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  items: SearchResultItem[];
  groups: SearchResultGroup[];
}

const GROUP_LABELS: Record<SearchResultKind, string> = {
  team: "Teams",
  player: "Players",
  event: "Events",
  match: "Matches",
  season: "Seasons",
  news: "News",
  sponsor: "Sponsors",
  media: "Media",
};

const GROUP_ORDER: SearchResultKind[] = ["team", "player", "event", "match", "season", "news", "sponsor", "media"];

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function tokenize(query: string) {
  return normalizeQuery(query).toLowerCase().split(" ").filter(Boolean);
}

function buildSearchText(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) =>
      String(part ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(" ");
}

function matchesQuery(searchText: string, tokens: string[]) {
  return tokens.every((token) => searchText.includes(token));
}

function scoreResult(item: Omit<SearchResultItem, "score">, query: string, tokens: string[]) {
  const normalizedTitle = item.title.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 120;
  } else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 80;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 50;
  }

  for (const token of tokens) {
    if (normalizedTitle.startsWith(token)) score += 18;
    if (normalizedTitle.includes(token)) score += 10;
    if (item.searchText.includes(token)) score += 4;
  }

  return {
    ...item,
    score,
  } satisfies SearchResultItem;
}

export async function searchPlatformContent(rawQuery: string): Promise<SearchResponse> {
  const query = normalizeQuery(rawQuery);

  if (query.length < 2) {
    return {
      query,
      total: 0,
      items: [],
      groups: [],
    };
  }

  const tokens = tokenize(query);
  const [hub, pubg, seasons] = await Promise.all([getPlatformHubData(), getPubgHubDataset(), getSeasons()]);

  const baseResults: Array<Omit<SearchResultItem, "score">> = [
    ...pubg.teams.map((team) => ({
      kind: "team" as const,
      title: team.name,
      href: `/pubg/teams/${team.slug || team.id}`,
      description: `${team.wins} WWCD · ${team.kills} kills · ${team.totalPoints} total points`,
      subtitle: `PUBG Team · ${team.matches} matches · ${team.formLabel} form`,
      badge: "Team",
      searchText: buildSearchText([team.name, team.tag, team.region, team.slotNumber, team.formLabel]),
    })),
    ...pubg.players.map((player) => ({
      kind: "player" as const,
      title: player.pubgName,
      href: `/pubg/players/${player.slug || player.id}`,
      description: `${player.kills} kills · ${player.assists} assists · ${player.damage} damage`,
      subtitle: `PUBG Player · ${player.currentTeamName ?? "Free Agent"} · ${player.matches} matches`,
      badge: "Player",
      searchText: buildSearchText([player.pubgName, player.currentTeamName, player.currentTeamTag, player.previousTeams.join(" ")]),
    })),
    ...hub.events.map((event) => ({
      kind: "event" as const,
      title: event.name,
      href: getCanonicalPublicEventHref(event),
      description: `${event.teamsCount} teams · ${event.matchesCount} matches · ${event.prizePool}`,
      subtitle: `${event.gameName} · ${event.type} · ${event.status}`,
      badge: "Event",
      searchText: buildSearchText([event.name, event.slug, event.gameName, event.type, event.region, event.organizerName, event.status]),
    })),
    ...hub.matches.map((match) => ({
      kind: "match" as const,
      title: `${match.eventName} · ${match.stageLabel}`,
      href:
        match.gameSlug === "pubg-pc"
          ? match.eventSlug
            ? `/pubg/events/${match.eventSlug}?tab=matches`
            : "/pubg/results"
          : `/matches/${match.id}`,
      description: `${match.teamA} vs ${match.teamB}${match.winnerName ? ` · Winner: ${match.winnerName}` : ""}`,
      subtitle: `${match.gameName} · ${match.mapLabel} · ${match.status}`,
      badge: "Match",
      searchText: buildSearchText([
        match.eventName,
        match.stageLabel,
        match.teamA,
        match.teamB,
        match.winnerName,
        match.mapLabel,
        match.status,
      ]),
    })),
    ...seasons.map((season) => ({
      kind: "season" as const,
      title: season.title,
      href: `/pubg/seasons/${season.slug}`,
      description: `${season.seriesTitle} · Day ${season.currentDay} of ${season.configuredDays}`,
      subtitle: `${season.game ?? "PUBG PC"} · ${season.status}`,
      badge: "Season",
      searchText: buildSearchText([
        season.title,
        season.slug,
        season.seriesTitle,
        season.game,
        season.format,
        season.region,
        season.status,
      ]),
    })),
    ...hub.news.map((article) => ({
      kind: "news" as const,
      title: article.title,
      href: `/news/${article.slug}`,
      description: article.summary,
      subtitle: `${article.category} · ${article.date}`,
      badge: "News",
      searchText: buildSearchText([article.title, article.summary, article.category, article.authorName, article.tags.join(" ")]),
    })),
    ...hub.sponsors.map((sponsor) => ({
      kind: "sponsor" as const,
      title: sponsor.name,
      href: `/sponsors/${sponsor.slug}`,
      description: sponsor.description,
      subtitle: `${sponsor.kind} · ${sponsor.tier}`,
      badge: "Sponsor",
      searchText: buildSearchText([
        sponsor.name,
        sponsor.slug,
        sponsor.kind,
        sponsor.tier,
        sponsor.supportedEvents.join(" "),
        sponsor.eventSlugs.join(" "),
      ]),
    })),
    ...hub.media.map((item) => ({
      kind: "media" as const,
      title: item.title,
      href: `/media/${item.slug}`,
      description: item.summary,
      subtitle: `${item.kind} · ${item.category}${item.duration ? ` · ${item.duration}` : ""}`,
      badge: "Media",
      searchText: buildSearchText([item.title, item.kind, item.category, item.gameSlug, item.summary]),
    })),
  ];

  const items = baseResults
    .filter((item) => matchesQuery(item.searchText, tokens))
    .map((item) => scoreResult(item, query, tokens))
    .sort(
      (firstItem, secondItem) =>
        secondItem.score - firstItem.score ||
        firstItem.kind.localeCompare(secondItem.kind) ||
        firstItem.title.localeCompare(secondItem.title),
    )
    .slice(0, 60);

  const groups = GROUP_ORDER.map((kind) => {
    const kindItems = items.filter((item) => item.kind === kind);
    return {
      kind,
      label: GROUP_LABELS[kind],
      items: kindItems,
      count: kindItems.length,
    } satisfies SearchResultGroup;
  }).filter((group) => group.count > 0);

  return {
    query,
    total: items.length,
    items,
    groups,
  };
}
