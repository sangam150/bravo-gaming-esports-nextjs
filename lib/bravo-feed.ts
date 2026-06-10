import type { TournamentStatus } from "./types";

export const BRAVO_FEED_URL = "https://www.birajlamsal0.com.np/tournaments";
const BRAVO_FEED_ORIGIN = new URL(BRAVO_FEED_URL).origin;

type BravoFeedCardMatch = {
  sourceId: string;
  sourceName: string;
  sourceStatus: string;
  sourceUrl: string;
  dayNumber: number;
};

export type BravoSourceMatchResult = {
  matchId: string;
  teamId: string | null;
  teamName: string;
  placement: number;
  kills: number;
};

export type BravoSourceMatch = {
  id: string;
  tournamentId: string;
  sequenceNumber: number;
  mapName: string;
  scheduledAt: string;
  results: BravoSourceMatchResult[];
};

export type BravoSourceStanding = {
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  totalKills: number;
  chickenDinners: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement: number;
  rank: number;
};

export type BravoSourcePlayerStanding = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  totalKills: number;
  totalAssists: number;
  totalKnocks: number;
  totalDamageDealt: number;
  placementPoints: number;
  totalPoints: number;
  averageDamageDealt?: number;
  bestPlacement?: number;
  rank: number;
};

export type BravoSourceTournament = {
  id: string;
  code: string;
  name: string;
  description: string;
  isLocked: boolean;
  status: string;
  createdAt: string;
  teamCount: number;
  matchCount: number;
  teams: Array<{ id: string; name: string }>;
  matches: BravoSourceMatch[];
  bannerUrl?: string;
  region?: string;
  mode?: string;
  perspective?: string;
  tier?: string;
  prizePool?: number;
  rules?: string;
  maxSlots?: number;
  startDate?: string;
  endDate?: string;
  registrationStatus?: string;
  matchType?: string;
  registrationCharge?: number;
  featured?: boolean;
  registrationFormUrl?: string;
  discordInviteUrl?: string;
};

export type BravoTournamentPayload = {
  tournament: BravoSourceTournament;
  standings: BravoSourceStanding[] | string;
  playerStandings: BravoSourcePlayerStanding[];
  tournamentState: string;
  showCompetitionSections: boolean;
  playersTabEnabled: boolean;
  rulesTabEnabled: boolean;
  initialTab: string;
  slug: string;
};

export type BravoTournamentFeedItem = BravoFeedCardMatch & {
  title: string;
  status: TournamentStatus;
  payload: BravoTournamentPayload;
};

const FALLBACK_IDS: Record<number, { sourceId: string; sourceName: string }> = {
  1: { sourceId: "48333", sourceName: "Bravo Gaming" },
  2: { sourceId: "61945", sourceName: "Bravo - Day 2" },
  3: { sourceId: "36714", sourceName: "BRAVOGAMING-DAY 3" },
  4: { sourceId: "36532", sourceName: "Bravo Gaming DAY -4" },
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function parseDayNumber(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "bravo gaming" || /day\s*1\b/.test(normalizedValue)) return 1;
  const dayMatch = normalizedValue.match(/day\s*[- ]*\s*(\d+)/i);
  return dayMatch ? Number(dayMatch[1]) : null;
}

export function buildBravoTournamentTitle(dayNumber: number) {
  return `Bravo Gaming Day ${dayNumber}`;
}

export function buildBravoTournamentSlug(dayNumber: number) {
  return `bravo-gaming-day-${dayNumber}`;
}

export function buildBravoDayTag(dayNumber: number) {
  return `Day ${dayNumber}`;
}

function normalizeTournamentStatus(value: string): TournamentStatus {
  return value.toLowerCase() === "finished" ? "COMPLETED" : "LIVE";
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "BravoGamingEsportsImporter/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Bravo feed request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

function extractFeedCards(html: string): BravoFeedCardMatch[] {
  const cardPattern =
    /<div class="premium-card[\s\S]*?<span class="status-badge [^"]+">([^<]+)<\/span>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?href="\/tournaments\/(\d+)"/g;

  const matches: BravoFeedCardMatch[] = [];

  for (const match of html.matchAll(cardPattern)) {
    const sourceStatus = decodeHtml(match[1] ?? "").toLowerCase();
    const sourceName = stripTags(match[2] ?? "");
    const sourceId = match[3] ?? "";
    const dayNumber = parseDayNumber(sourceName);

    if (!dayNumber || !sourceId || !sourceName.toLowerCase().includes("bravo")) continue;

    matches.push({
      sourceId,
      sourceName,
      sourceStatus,
      sourceUrl: `${BRAVO_FEED_ORIGIN}/tournaments/${sourceId}`,
      dayNumber,
    });
  }

  return matches;
}

function withFallbackCards(cards: BravoFeedCardMatch[]) {
  const byDay = new Map(cards.map((card) => [card.dayNumber, card]));

  for (const [dayNumber, fallback] of Object.entries(FALLBACK_IDS)) {
    const numericDay = Number(dayNumber);
    if (byDay.has(numericDay)) continue;

    byDay.set(numericDay, {
      sourceId: fallback.sourceId,
      sourceName: fallback.sourceName,
      sourceStatus: "ongoing",
      sourceUrl: `${BRAVO_FEED_ORIGIN}/tournaments/${fallback.sourceId}`,
      dayNumber: numericDay,
    });
  }

  return Array.from(byDay.values()).sort((firstCard, secondCard) => firstCard.dayNumber - secondCard.dayNumber);
}

function extractNextPayloadStrings(html: string) {
  return [...html.matchAll(/self\.__next_f\.push\(\[(\d+),("(?:[^"\\]|\\.)*")\]\)<\/script>/g)].map((match) =>
    JSON.parse(match[2]!)
  );
}

function extractPayloadObject(decodedPayload: string) {
  const keyIndex = decodedPayload.indexOf('"tournament":');
  if (keyIndex === -1) return null;

  let startIndex = keyIndex;
  while (startIndex >= 0 && decodedPayload[startIndex] !== "{") {
    startIndex -= 1;
  }

  if (startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = startIndex; index < decodedPayload.length; index += 1) {
    const character = decodedPayload[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (character === "\\") {
      escapeNext = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(decodedPayload.slice(startIndex, index + 1)) as BravoTournamentPayload;
      }
    }
  }

  return null;
}

function parseTournamentPayload(html: string) {
  const decodedPayload = extractNextPayloadStrings(html).find((payload) => payload.includes('"tournament":'));
  if (!decodedPayload) {
    throw new Error("Unable to locate Bravo tournament payload in the source page.");
  }

  const parsedPayload = extractPayloadObject(decodedPayload);
  if (!parsedPayload) {
    throw new Error("Unable to parse the Bravo tournament payload.");
  }

  return parsedPayload;
}

export async function fetchBravoFeedTournaments(options?: { maxDay?: number }): Promise<BravoTournamentFeedItem[]> {
  const indexHtml = await fetchText(BRAVO_FEED_URL);
  const cards = withFallbackCards(extractFeedCards(indexHtml));
  const filteredCards =
    typeof options?.maxDay === "number"
      ? cards.filter((card) => card.dayNumber <= options.maxDay)
      : cards;

  const tournamentItems = await Promise.all(
    filteredCards.map(async (card) => {
      const detailHtml = await fetchText(card.sourceUrl);
      const payload = parseTournamentPayload(detailHtml);
      const dayNumber = parseDayNumber(payload.tournament.name) ?? card.dayNumber;

      return {
        ...card,
        dayNumber,
        title: buildBravoTournamentTitle(dayNumber),
        status: normalizeTournamentStatus(payload.tournament.status),
        sourceName: payload.tournament.name,
        sourceStatus: payload.tournament.status,
        payload,
      } satisfies BravoTournamentFeedItem;
    })
  );

  return tournamentItems.sort((firstItem, secondItem) => firstItem.dayNumber - secondItem.dayNumber);
}
