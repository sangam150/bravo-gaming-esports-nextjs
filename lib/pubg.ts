const PUBG_BASE = "https://api.pubg.com";
export const PUBG_SHARD = process.env.PUBG_SHARD || "steam";

type PubgResource = {
  id?: string;
  type?: string;
  attributes?: {
    URL?: string;
    createdAt?: string;
    duration?: number;
    gameMode?: string;
    mapName?: string;
    name?: string;
    shardId?: string;
  };
  relationships?: {
    matches?: {
      data?: Array<{ id: string }>;
    };
  };
};

type PubgApiDocument = {
  data?: PubgResource | PubgResource[];
  included?: PubgResource[];
};

function getApiKey() {
  const key = process.env.PUBG_API_KEY;
  if (!key) throw new Error("Missing PUBG_API_KEY in .env.local");
  return key;
}

export async function pubgFetch(path: string, needsAuth = true): Promise<PubgApiDocument> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
  };
  if (needsAuth) headers.Authorization = `Bearer ${getApiKey()}`;
  const res = await fetch(`${PUBG_BASE}${path}`, {
    headers,
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`PUBG API error ${res.status}: ${await res.text()}`);
  return (await res.json()) as PubgApiDocument;
}

async function fetchPubgPlayerByName(playerName: string) {
  const playerData = await pubgFetch(`/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(playerName)}`);
  const player = Array.isArray(playerData.data) ? playerData.data[0] : undefined;

  if (!player) {
    throw new Error(`No PUBG player found for "${playerName}".`);
  }

  return {
    id: player.id as string,
    name: (player.attributes?.name as string | undefined) ?? playerName,
    shardId: (player.attributes?.shardId as string | undefined) ?? PUBG_SHARD,
    matchIds: (player.relationships?.matches?.data as Array<{ id: string }> | undefined)?.map((match) => match.id) ?? [],
    raw: playerData,
  };
}

async function fetchPubgPlayerById(playerId: string) {
  const playerData = await pubgFetch(`/shards/${PUBG_SHARD}/players/${encodeURIComponent(playerId)}`);
  const player = Array.isArray(playerData.data) ? undefined : playerData.data;

  if (!player) {
    throw new Error(`No PUBG player found for "${playerId}".`);
  }

  return {
    id: player.id as string,
    name: (player.attributes?.name as string | undefined) ?? playerId,
    shardId: (player.attributes?.shardId as string | undefined) ?? PUBG_SHARD,
    matchIds: (player.relationships?.matches?.data as Array<{ id: string }> | undefined)?.map((match) => match.id) ?? [],
    raw: playerData,
  };
}

export async function fetchPubgPlayerRecentMatches(playerName: string, limit = 10) {
  const player = await fetchPubgPlayerByName(playerName);
  const recentMatchIds = player.matchIds.slice(0, Math.max(1, limit));
  const summaries = await Promise.all(
    recentMatchIds.map(async (matchId) => {
      const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
      const summary = summarizeMatch(matchData);

      return {
        matchId,
        mapName: summary.mapName ?? "Unknown",
        gameMode: summary.gameMode ?? "unknown",
        createdAt: summary.createdAt ?? new Date().toISOString(),
        duration: summary.duration,
      };
    }),
  );

  return {
    playerId: player.id,
    playerName: player.name,
    shardId: player.shardId,
    recentMatches: summaries,
    raw: player.raw,
  };
}

export async function fetchPubgPlayerRecentMatchesById(playerId: string, limit = 10) {
  const player = await fetchPubgPlayerById(playerId);
  const recentMatchIds = player.matchIds.slice(0, Math.max(1, limit));
  const summaries = await Promise.all(
    recentMatchIds.map(async (matchId) => {
      const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
      const summary = summarizeMatch(matchData);

      return {
        matchId,
        mapName: summary.mapName ?? "Unknown",
        gameMode: summary.gameMode ?? "unknown",
        createdAt: summary.createdAt ?? new Date().toISOString(),
        duration: summary.duration,
      };
    }),
  );

  return {
    playerId: player.id,
    playerName: player.name,
    shardId: player.shardId,
    recentMatches: summaries,
    raw: player.raw,
  };
}

export function placementPoints(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 5;
  if (placement === 4) return 4;
  if (placement === 5) return 3;
  if (placement === 6) return 2;
  if (placement === 7 || placement === 8) return 1;
  return 0;
}

export function totalPoints(placement: number, kills: number) {
  return placementPoints(placement) + kills;
}

export function extractTelemetryUrl(matchData: PubgApiDocument): string | null {
  const asset = matchData.included?.find((item) => item.type === "asset");
  return asset?.attributes?.URL || null;
}

export function summarizeMatch(matchData: PubgApiDocument) {
  const resource = Array.isArray(matchData.data) ? matchData.data[0] : matchData.data;
  const attrs = resource?.attributes;
  return {
    id: resource?.id,
    mapName: attrs?.mapName,
    gameMode: attrs?.gameMode,
    createdAt: attrs?.createdAt,
    duration: attrs?.duration,
    telemetryUrl: extractTelemetryUrl(matchData),
  };
}
