import type { PubgImportWarning } from "@/lib/types";

type JsonObject = Record<string, unknown>;

interface ParsedPubgMatchSummary {
  id?: string;
  createdAt?: string;
  duration?: number;
  gameMode?: string;
  mapName?: string;
  platform?: string;
  shard?: string;
  telemetryUrl?: string | null;
}

interface ParsedPubgMatchTeam {
  rosterId: string;
  teamId?: string;
  teamName: string;
  placement: number;
  wwcd: boolean;
  kills: number;
  playerIds: string[];
}

export interface ParsedPubgMatchPlayer {
  rosterId: string;
  teamId?: string;
  teamName: string;
  placement: number;
  playerId: string;
  pubgPlayerId?: string;
  playerName: string;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  headshotKills: number;
  longestKill: number;
  rideDistance: number;
  walkDistance: number;
  swimDistance: number;
  survivalTime: number;
  heals: number;
  boosts: number;
  vehicleDestroys: number;
  weaponsAcquired: number;
  roadKills: number;
  teamKills: number;
}

export interface ParsedPubgMatch {
  match: ParsedPubgMatchSummary;
  teams: ParsedPubgMatchTeam[];
  players: ParsedPubgMatchPlayer[];
  warnings: PubgImportWarning[];
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
}

function asArray<T = unknown>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function pushMissingFieldWarning(warnings: PubgImportWarning[], field: string, message: string, extra: Partial<PubgImportWarning> = {}) {
  warnings.push({
    type: "missing_field",
    field,
    message,
    ...extra,
  });
}

function getParticipantIds(relationships: JsonObject | null) {
  const participants = asObject(relationships?.participants);
  return asArray<JsonObject>(participants?.data)
    .map((item) => readString(asObject(item)?.id))
    .filter((value): value is string => Boolean(value));
}

export function parsePubgMatch(rawJson: unknown): ParsedPubgMatch {
  const warnings: PubgImportWarning[] = [];
  const root = asObject(rawJson);
  const data = asObject(root?.data);
  const matchAttributes = asObject(data?.attributes);
  const included = asArray<JsonObject>(root?.included);

  const matchId = readString(data?.id);
  const mapName = readString(matchAttributes?.mapName);
  const createdAt = readString(matchAttributes?.createdAt);
  const duration = readNumber(matchAttributes?.duration);
  const gameMode = readString(matchAttributes?.gameMode);
  const shard = readString(matchAttributes?.shardId);
  const platform = readString(matchAttributes?.platform) ?? readString(matchAttributes?.platformName);

  if (!matchId) {
    pushMissingFieldWarning(warnings, "match.id", "PUBG match payload is missing the match ID.");
  }
  if (!mapName) {
    pushMissingFieldWarning(warnings, "match.mapName", "PUBG match payload is missing the map name.");
  }
  if (!createdAt) {
    pushMissingFieldWarning(warnings, "match.createdAt", "PUBG match payload is missing the created timestamp.");
  }
  if (typeof duration !== "number") {
    pushMissingFieldWarning(warnings, "match.duration", "PUBG match payload is missing the match duration.");
  }

  const telemetryAsset = included.find((item) => readString(item.type) === "asset");
  const telemetryUrl = readString(asObject(telemetryAsset?.attributes)?.URL) ?? null;

  const rosters = new Map<
    string,
    {
      placement: number;
      playerIds: string[];
      rosterId: string;
      teamId?: string;
      teamName: string;
    }
  >();

  for (const [index, item] of included.entries()) {
    if (readString(item.type) !== "roster") {
      continue;
    }

    const rosterId = readString(item.id) ?? `roster-${index + 1}`;
    const attributes = asObject(item.attributes);
    const stats = asObject(attributes?.stats);
    const placement = readNumber(stats?.rank) ?? readNumber(stats?.winPlace) ?? 99;
    const teamName = readString(attributes?.teamId) ?? readString(stats?.teamId) ?? `Roster ${index + 1}`;

    if (!readString(attributes?.teamId) && !readString(stats?.teamId)) {
      pushMissingFieldWarning(warnings, "roster.teamId", "A PUBG roster is missing a team name.", {
        rosterId,
        teamName,
      });
    }

    rosters.set(rosterId, {
      rosterId,
      teamId: readString(attributes?.teamId) ?? readString(stats?.teamId),
      teamName,
      placement,
      playerIds: getParticipantIds(asObject(item.relationships)),
    });
  }

  const players: ParsedPubgMatchPlayer[] = [];
  for (const [index, item] of included.entries()) {
    if (readString(item.type) !== "participant") {
      continue;
    }

    const attributes = asObject(item.attributes);
    const stats = asObject(attributes?.stats);
    const rosterRelationship = asObject(asObject(item.relationships)?.roster);
    const rosterId = readString(asObject(rosterRelationship?.data)?.id) ?? "";
    const roster = rosters.get(rosterId);
    const playerName = readString(attributes?.name) ?? readString(stats?.name) ?? `Player ${index + 1}`;
    const playerId = readString(item.id) ?? `participant-${index + 1}`;

    if (!readString(attributes?.name) && !readString(stats?.name)) {
      pushMissingFieldWarning(warnings, "participant.name", "A PUBG participant is missing a player name.", {
        playerName,
        pubgPlayerId: playerId,
        rosterId,
      });
    }

    if (!roster) {
      pushMissingFieldWarning(warnings, "participant.roster", "A PUBG participant could not be linked to a roster.", {
        playerName,
        pubgPlayerId: playerId,
        rosterId,
      });
    }

    players.push({
      rosterId,
      teamId: roster?.teamId,
      teamName: roster?.teamName ?? "Unknown Team",
      placement: roster?.placement ?? readNumber(stats?.winPlace) ?? 99,
      playerId,
      pubgPlayerId: playerId,
      playerName,
      kills: readNumber(stats?.kills) ?? 0,
      assists: readNumber(stats?.assists) ?? 0,
      knocks: readNumber(stats?.DBNOs) ?? 0,
      damage: Math.round(readNumber(stats?.damageDealt) ?? 0),
      headshotKills: readNumber(stats?.headshotKills) ?? 0,
      longestKill: readNumber(stats?.longestKill) ?? 0,
      rideDistance: Math.round(readNumber(stats?.rideDistance) ?? 0),
      walkDistance: Math.round(readNumber(stats?.walkDistance) ?? 0),
      swimDistance: Math.round(readNumber(stats?.swimDistance) ?? 0),
      survivalTime: Math.round(readNumber(stats?.timeSurvived) ?? 0),
      heals: readNumber(stats?.heals) ?? 0,
      boosts: readNumber(stats?.boosts) ?? 0,
      vehicleDestroys: readNumber(stats?.vehicleDestroys) ?? 0,
      weaponsAcquired: readNumber(stats?.weaponsAcquired) ?? 0,
      roadKills: readNumber(stats?.roadKills) ?? 0,
      teamKills: readNumber(stats?.teamKills) ?? 0,
    });
  }

  const teamsFromRosters = Array.from(rosters.values()).map((roster) => {
    const rosterPlayers = players.filter((player) => player.rosterId === roster.rosterId);
    return {
      rosterId: roster.rosterId,
      teamId: roster.teamId,
      teamName: roster.teamName,
      placement: roster.placement,
      wwcd: roster.placement === 1,
      kills: rosterPlayers.reduce((sum, player) => sum + player.kills, 0),
      playerIds: rosterPlayers.map((player) => player.playerId),
    } satisfies ParsedPubgMatchTeam;
  });

  const teams =
    teamsFromRosters.length > 0
      ? teamsFromRosters
      : Array.from(
          players
            .reduce<Map<string, ParsedPubgMatchTeam>>((result, player) => {
              const current = result.get(player.teamName) ?? {
                rosterId: player.rosterId || player.teamName,
                teamId: player.teamId,
                teamName: player.teamName,
                placement: player.placement,
                wwcd: player.placement === 1,
                kills: 0,
                playerIds: [],
              };
              current.placement = Math.min(current.placement, player.placement);
              current.wwcd = current.placement === 1;
              current.kills += player.kills;
              current.playerIds.push(player.playerId);
              result.set(player.teamName, current);
              return result;
            }, new Map())
            .values(),
        );

  return {
    match: {
      id: matchId,
      mapName,
      gameMode,
      createdAt,
      duration,
      shard,
      platform,
      telemetryUrl,
    },
    teams: teams.sort((firstTeam, secondTeam) => firstTeam.placement - secondTeam.placement),
    players,
    warnings,
  };
}
