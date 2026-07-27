"use client";

import {
  DualTrendChart,
  EmptyState,
  formatDateTime,
  formatDecimal,
  formatNumber,
  FormPill,
  PageHero,
  PlayerIdentity,
  RadarComparison,
  RankBadge,
  TeamIdentity,
  TrendBars,
} from "@/components/pubg/PubgHubUI";
import type { PubgHubDataset, PubgHubMatch, PubgHubPlayer, PubgHubTeam } from "@/lib/pubg-hub";
import Link from "next/link";
import { useState } from "react";

type CompareMode = "teams" | "players";
type WindowMode = "7" | "30" | "all";

type TeamSummary = {
  id: string;
  team: PubgHubTeam;
  matches: number;
  wins: number;
  kills: number;
  damage: number;
  totalPoints: number;
  avgPlacement: number;
  recentPoints: number[];
  recentKills: number[];
  recentMatches: PubgHubMatch[];
  mapRows: Array<{
    map: string;
    matches: number;
    avgPoints: number;
    avgKills: number;
    damage: number;
  }>;
};

type PlayerSummary = {
  id: string;
  player: PubgHubPlayer;
  matches: number;
  wins: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  recentKills: number[];
  recentDamage: number[];
  recentMatches: PubgHubMatch[];
  mapRows: Array<{
    map: string;
    matches: number;
    avgKills: number;
    avgDamage: number;
    wins: number;
  }>;
};

type ComparePageClientProps = {
  dataset: PubgHubDataset;
  initialEvent?: string;
  initialMap?: string;
  initialMode?: CompareMode;
  initialSideA?: string;
  initialSideB?: string;
  initialWindow?: WindowMode;
};

function filterMatchesByWindow(matches: PubgHubMatch[], windowMode: WindowMode) {
  if (windowMode === "all") {
    return matches;
  }

  const days = windowMode === "7" ? 7 : 30;
  const newestTimestamp = matches.reduce((maxValue, match) => {
    const timestamp = new Date(match.startTime).getTime();
    return Number.isFinite(timestamp) ? Math.max(maxValue, timestamp) : maxValue;
  }, 0);

  const threshold = newestTimestamp - days * 24 * 60 * 60 * 1000;

  return matches.filter((match) => {
    const timestamp = new Date(match.startTime).getTime();
    return Number.isFinite(timestamp) ? timestamp >= threshold : false;
  });
}

function sortMatchesByNewest(firstValue: PubgHubMatch, secondValue: PubgHubMatch) {
  return secondValue.startTime.localeCompare(firstValue.startTime);
}

function buildTeamSummary(matches: PubgHubMatch[], team: PubgHubTeam): TeamSummary {
  const relevantMatches = matches
    .filter((match) => match.teamResults.some((teamResult) => teamResult.teamId === team.id))
    .sort(sortMatchesByNewest);

  const totals = relevantMatches.reduce(
    (result, match) => {
      const teamResult = match.teamResults.find((item) => item.teamId === team.id);
      if (!teamResult) {
        return result;
      }

      result.matches += 1;
      result.wins += teamResult.wwcd ? 1 : 0;
      result.kills += teamResult.kills;
      result.totalPoints += teamResult.totalPoints;
      result.totalPlacement += teamResult.placement;
      result.damage += match.playerResults
        .filter((playerResult) => playerResult.teamId === team.id)
        .reduce((sum, playerResult) => sum + playerResult.damage, 0);
      result.recentPoints.push(teamResult.totalPoints);
      result.recentKills.push(teamResult.kills);
      return result;
    },
    {
      matches: 0,
      wins: 0,
      kills: 0,
      damage: 0,
      totalPoints: 0,
      totalPlacement: 0,
      recentPoints: [] as number[],
      recentKills: [] as number[],
    },
  );

  const mapRows = Array.from(
    relevantMatches
      .reduce((result, match) => {
        const teamResult = match.teamResults.find((item) => item.teamId === team.id);
        if (!teamResult) {
          return result;
        }

        const existing = result.get(match.mapName) ?? {
          map: match.mapName,
          matches: 0,
          points: 0,
          kills: 0,
          damage: 0,
        };
        existing.matches += 1;
        existing.points += teamResult.totalPoints;
        existing.kills += teamResult.kills;
        existing.damage += match.playerResults
          .filter((playerResult) => playerResult.teamId === team.id)
          .reduce((sum, playerResult) => sum + playerResult.damage, 0);
        result.set(match.mapName, existing);
        return result;
      }, new Map<string, { map: string; matches: number; points: number; kills: number; damage: number }>())
      .values(),
  )
    .map((row) => ({
      map: row.map,
      matches: row.matches,
      avgPoints: row.points / Math.max(row.matches, 1),
      avgKills: row.kills / Math.max(row.matches, 1),
      damage: row.damage,
    }))
    .sort((firstValue, secondValue) => secondValue.avgPoints - firstValue.avgPoints);

  return {
    id: team.id,
    team,
    matches: totals.matches,
    wins: totals.wins,
    kills: totals.kills,
    damage: totals.damage,
    totalPoints: totals.totalPoints,
    avgPlacement: totals.totalPlacement / Math.max(totals.matches, 1),
    recentPoints: totals.recentPoints.slice(0, 6).reverse(),
    recentKills: totals.recentKills.slice(0, 6).reverse(),
    recentMatches: relevantMatches.slice(0, 6),
    mapRows,
  };
}

function buildPlayerSummary(matches: PubgHubMatch[], player: PubgHubPlayer): PlayerSummary {
  const relevantMatches = matches
    .filter((match) => match.playerResults.some((playerResult) => playerResult.playerId === player.id))
    .sort(sortMatchesByNewest);

  const totals = relevantMatches.reduce(
    (result, match) => {
      const playerResult = match.playerResults.find((item) => item.playerId === player.id);
      if (!playerResult) {
        return result;
      }

      result.matches += 1;
      result.wins += match.winnerTeamId === playerResult.teamId ? 1 : 0;
      result.kills += playerResult.kills;
      result.assists += playerResult.assists;
      result.knocks += playerResult.knocks;
      result.damage += playerResult.damage;
      result.recentKills.push(playerResult.kills);
      result.recentDamage.push(playerResult.damage);
      return result;
    },
    {
      matches: 0,
      wins: 0,
      kills: 0,
      assists: 0,
      knocks: 0,
      damage: 0,
      recentKills: [] as number[],
      recentDamage: [] as number[],
    },
  );

  const mapRows = Array.from(
    relevantMatches
      .reduce((result, match) => {
        const playerResult = match.playerResults.find((item) => item.playerId === player.id);
        if (!playerResult) {
          return result;
        }

        const existing = result.get(match.mapName) ?? {
          map: match.mapName,
          matches: 0,
          kills: 0,
          damage: 0,
          wins: 0,
        };
        existing.matches += 1;
        existing.kills += playerResult.kills;
        existing.damage += playerResult.damage;
        existing.wins += match.winnerTeamId === playerResult.teamId ? 1 : 0;
        result.set(match.mapName, existing);
        return result;
      }, new Map<string, { map: string; matches: number; kills: number; damage: number; wins: number }>())
      .values(),
  )
    .map((row) => ({
      map: row.map,
      matches: row.matches,
      avgKills: row.kills / Math.max(row.matches, 1),
      avgDamage: row.damage / Math.max(row.matches, 1),
      wins: row.wins,
    }))
    .sort((firstValue, secondValue) => secondValue.avgKills - firstValue.avgKills);

  return {
    id: player.id,
    player,
    matches: totals.matches,
    wins: totals.wins,
    kills: totals.kills,
    assists: totals.assists,
    knocks: totals.knocks,
    damage: totals.damage,
    avgKills: totals.kills / Math.max(totals.matches, 1),
    avgDamage: totals.damage / Math.max(totals.matches, 1),
    recentKills: totals.recentKills.slice(0, 6).reverse(),
    recentDamage: totals.recentDamage.slice(0, 6).reverse(),
    recentMatches: relevantMatches.slice(0, 6),
    mapRows,
  };
}

function buildTeamHeadToHead(matches: PubgHubMatch[], firstTeamId: string, secondTeamId: string) {
  return matches.reduce(
    (result, match) => {
      const firstResult = match.teamResults.find((item) => item.teamId === firstTeamId);
      const secondResult = match.teamResults.find((item) => item.teamId === secondTeamId);

      if (!firstResult || !secondResult) {
        return result;
      }

      result.sharedMatches += 1;
      result.firstPoints += firstResult.totalPoints;
      result.secondPoints += secondResult.totalPoints;

      if (firstResult.placement < secondResult.placement) {
        result.firstWins += 1;
      } else if (secondResult.placement < firstResult.placement) {
        result.secondWins += 1;
      } else if (firstResult.totalPoints > secondResult.totalPoints) {
        result.firstWins += 1;
      } else if (secondResult.totalPoints > firstResult.totalPoints) {
        result.secondWins += 1;
      }

      return result;
    },
    {
      sharedMatches: 0,
      firstWins: 0,
      secondWins: 0,
      firstPoints: 0,
      secondPoints: 0,
    },
  );
}

function buildPlayerHeadToHead(matches: PubgHubMatch[], firstPlayerId: string, secondPlayerId: string) {
  return matches.reduce(
    (result, match) => {
      const firstResult = match.playerResults.find((item) => item.playerId === firstPlayerId);
      const secondResult = match.playerResults.find((item) => item.playerId === secondPlayerId);

      if (!firstResult || !secondResult) {
        return result;
      }

      result.sharedMatches += 1;
      result.firstKills += firstResult.kills;
      result.secondKills += secondResult.kills;
      result.firstDamage += firstResult.damage;
      result.secondDamage += secondResult.damage;
      return result;
    },
    {
      sharedMatches: 0,
      firstKills: 0,
      secondKills: 0,
      firstDamage: 0,
      secondDamage: 0,
    },
  );
}

function CompareMetric({ label, leftValue, rightValue }: { label: string; leftValue: string | number; rightValue: string | number }) {
  return (
    <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 border-b border-white/[0.06] py-3 last:border-b-0">
      <p className="text-right font-mono-stat text-white">{leftValue}</p>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="font-mono-stat text-white">{rightValue}</p>
    </div>
  );
}

function IdentityPanels({
  mode,
  firstTeam,
  secondTeam,
  firstPlayer,
  secondPlayer,
}: {
  mode: CompareMode;
  firstTeam: PubgHubTeam | null;
  secondTeam: PubgHubTeam | null;
  firstPlayer: PubgHubPlayer | null;
  secondPlayer: PubgHubPlayer | null;
}) {
  if (mode === "teams" && firstTeam && secondTeam) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
          <div className="flex items-center gap-3">
            <RankBadge rank={1} />
            <TeamIdentity team={firstTeam} href={`/pubg/teams/${firstTeam.id}`} />
            <div className="ml-auto">
              <FormPill label={firstTeam.formLabel} />
            </div>
          </div>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
          <div className="flex items-center gap-3">
            <RankBadge rank={2} />
            <TeamIdentity team={secondTeam} href={`/pubg/teams/${secondTeam.id}`} />
            <div className="ml-auto">
              <FormPill label={secondTeam.formLabel} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "players" && firstPlayer && secondPlayer) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
          <div className="flex items-center gap-3">
            <RankBadge rank={1} />
            <PlayerIdentity player={firstPlayer} href={`/pubg/players/${firstPlayer.id}`} />
            <div className="ml-auto">
              <FormPill label={firstPlayer.formLabel} />
            </div>
          </div>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
          <div className="flex items-center gap-3">
            <RankBadge rank={2} />
            <PlayerIdentity player={secondPlayer} href={`/pubg/players/${secondPlayer.id}`} />
            <div className="ml-auto">
              <FormPill label={secondPlayer.formLabel} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function MapEdgeTable({
  leftLabel,
  rightLabel,
  rows,
}: {
  leftLabel: string;
  rightLabel: string;
  rows: Array<{
    map: string;
    leftPrimary: number;
    rightPrimary: number;
    leftSecondary: number;
    rightSecondary: number;
  }>;
}) {
  return (
    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Map Edge</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">Per-map output read</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.map} className="rounded-card border border-white/[0.08] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{row.map}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                {formatDecimal(row.leftPrimary, 2)} vs {formatDecimal(row.rightPrimary, 2)}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-[1fr,auto,1fr] items-center gap-3">
              <div className="rounded-full bg-accent-blue/15 px-3 py-2 text-right text-sm font-semibold text-accent-blue">
                {formatDecimal(row.leftPrimary, 2)} / {formatDecimal(row.leftSecondary, 2)}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Avg</p>
              <div className="rounded-full bg-accent-green/15 px-3 py-2 text-sm font-semibold text-accent-green">
                {formatDecimal(row.rightPrimary, 2)} / {formatDecimal(row.rightSecondary, 2)}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <EmptyState
            title="No map edge yet"
            description="Widen the time window or change the event filter to surface more shared map context."
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ComparePageClient({
  dataset,
  initialEvent,
  initialMap,
  initialMode = "teams",
  initialSideA,
  initialSideB,
  initialWindow = "30",
}: ComparePageClientProps) {
  const defaultTeams = dataset.teams.slice(0, 2);
  const defaultPlayers = dataset.players.slice(0, 2);

  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [windowMode, setWindowMode] = useState<WindowMode>(initialWindow);
  const [selectedEvent, setSelectedEvent] = useState(initialEvent ?? "all");
  const [selectedMap, setSelectedMap] = useState(initialMap ?? "all");
  const [showRosterOverlay, setShowRosterOverlay] = useState(true);
  const [teamSideA, setTeamSideA] = useState(initialSideA ?? defaultTeams[0]?.id ?? "");
  const [teamSideB, setTeamSideB] = useState(initialSideB ?? defaultTeams[1]?.id ?? defaultTeams[0]?.id ?? "");
  const [playerSideA, setPlayerSideA] = useState(initialSideA ?? defaultPlayers[0]?.id ?? "");
  const [playerSideB, setPlayerSideB] = useState(initialSideB ?? defaultPlayers[1]?.id ?? defaultPlayers[0]?.id ?? "");

  const filteredByWindow = filterMatchesByWindow(dataset.matches, windowMode);
  const filteredMatches = filteredByWindow.filter((match) => {
    if (selectedEvent !== "all" && match.eventSlug !== selectedEvent) return false;
    if (selectedMap !== "all" && match.mapName !== selectedMap) return false;
    return true;
  });
  const mapOptions = Array.from(new Set(dataset.matches.map((match) => match.mapName))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );

  const firstTeam = mode === "teams" ? (dataset.teams.find((team) => team.id === teamSideA) ?? null) : null;
  const secondTeam = mode === "teams" ? (dataset.teams.find((team) => team.id === teamSideB) ?? null) : null;
  const firstPlayer = mode === "players" ? (dataset.players.find((player) => player.id === playerSideA) ?? null) : null;
  const secondPlayer = mode === "players" ? (dataset.players.find((player) => player.id === playerSideB) ?? null) : null;

  const firstTeamSummary = firstTeam ? buildTeamSummary(filteredMatches, firstTeam) : null;
  const secondTeamSummary = secondTeam ? buildTeamSummary(filteredMatches, secondTeam) : null;
  const firstPlayerSummary = firstPlayer ? buildPlayerSummary(filteredMatches, firstPlayer) : null;
  const secondPlayerSummary = secondPlayer ? buildPlayerSummary(filteredMatches, secondPlayer) : null;

  const teamHeadToHead = firstTeam && secondTeam ? buildTeamHeadToHead(filteredMatches, firstTeam.id, secondTeam.id) : null;
  const playerHeadToHead = firstPlayer && secondPlayer ? buildPlayerHeadToHead(filteredMatches, firstPlayer.id, secondPlayer.id) : null;

  const teamRadarPoints =
    firstTeamSummary && secondTeamSummary
      ? [
          {
            label: "Points",
            firstValue: firstTeamSummary.totalPoints,
            secondValue: secondTeamSummary.totalPoints,
          },
          {
            label: "Kills",
            firstValue: firstTeamSummary.kills,
            secondValue: secondTeamSummary.kills,
          },
          {
            label: "Wins",
            firstValue: firstTeamSummary.wins,
            secondValue: secondTeamSummary.wins,
          },
          {
            label: "Damage",
            firstValue: firstTeamSummary.damage,
            secondValue: secondTeamSummary.damage,
          },
          {
            label: "Control",
            firstValue: Math.max(0, 20 - firstTeamSummary.avgPlacement),
            secondValue: Math.max(0, 20 - secondTeamSummary.avgPlacement),
          },
        ]
      : [];

  const playerRadarPoints =
    firstPlayerSummary && secondPlayerSummary
      ? [
          {
            label: "Kills",
            firstValue: firstPlayerSummary.kills,
            secondValue: secondPlayerSummary.kills,
          },
          {
            label: "Assists",
            firstValue: firstPlayerSummary.assists,
            secondValue: secondPlayerSummary.assists,
          },
          {
            label: "Knocks",
            firstValue: firstPlayerSummary.knocks,
            secondValue: secondPlayerSummary.knocks,
          },
          {
            label: "Damage",
            firstValue: firstPlayerSummary.damage,
            secondValue: secondPlayerSummary.damage,
          },
          {
            label: "Wins",
            firstValue: firstPlayerSummary.wins,
            secondValue: secondPlayerSummary.wins,
          },
        ]
      : [];

  const teamMapRows =
    firstTeamSummary && secondTeamSummary
      ? Array.from(new Set([...firstTeamSummary.mapRows.map((row) => row.map), ...secondTeamSummary.mapRows.map((row) => row.map)]))
          .map((map) => {
            const left = firstTeamSummary.mapRows.find((row) => row.map === map);
            const right = secondTeamSummary.mapRows.find((row) => row.map === map);
            return {
              map,
              leftPrimary: left?.avgPoints ?? 0,
              rightPrimary: right?.avgPoints ?? 0,
              leftSecondary: left?.avgKills ?? 0,
              rightSecondary: right?.avgKills ?? 0,
            };
          })
          .sort(
            (firstValue, secondValue) =>
              Math.max(secondValue.leftPrimary, secondValue.rightPrimary) - Math.max(firstValue.leftPrimary, firstValue.rightPrimary),
          )
      : [];

  const playerMapRows =
    firstPlayerSummary && secondPlayerSummary
      ? Array.from(new Set([...firstPlayerSummary.mapRows.map((row) => row.map), ...secondPlayerSummary.mapRows.map((row) => row.map)]))
          .map((map) => {
            const left = firstPlayerSummary.mapRows.find((row) => row.map === map);
            const right = secondPlayerSummary.mapRows.find((row) => row.map === map);
            return {
              map,
              leftPrimary: left?.avgKills ?? 0,
              rightPrimary: right?.avgKills ?? 0,
              leftSecondary: left?.avgDamage ?? 0,
              rightSecondary: right?.avgDamage ?? 0,
            };
          })
          .sort(
            (firstValue, secondValue) =>
              Math.max(secondValue.leftPrimary, secondValue.rightPrimary) - Math.max(firstValue.leftPrimary, firstValue.rightPrimary),
          )
      : [];

  function switchMode(nextMode: CompareMode) {
    setMode(nextMode);

    if (nextMode === "teams") {
      setTeamSideA(defaultTeams[0]?.id ?? "");
      setTeamSideB(defaultTeams[1]?.id ?? defaultTeams[0]?.id ?? "");
    } else {
      setPlayerSideA(defaultPlayers[0]?.id ?? "");
      setPlayerSideB(defaultPlayers[1]?.id ?? defaultPlayers[0]?.id ?? "");
    }
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Compare Studio"
          title={
            <>
              Side-by-side scouting
              <br />
              for teams and players
            </>
          }
          description="TrackD leans into narrower scouting reads with radar, trends, map edge, roster overlays, and head-to-head cards. The Bravo compare studio follows that model with relational match inputs and original public branding."
          actions={
            <>
              <Link href="/pubg" className="btn-secondary">
                Dashboard
              </Link>
              <Link href="/pubg/leaderboards" className="btn-primary">
                Leaderboards
              </Link>
            </>
          }
          stats={[
            {
              label: "Matches In View",
              value: filteredMatches.length,
              tone: "blue",
            },
            { label: "Compare Modes", value: "Teams + Players", tone: "green" },
            {
              label: "Signal Layers",
              value: "Radar + Trends + Map Edge",
              tone: "yellow",
            },
            {
              label: "Window",
              value: windowMode === "all" ? "All Time" : `Last ${windowMode} Days`,
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Studio Filters</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Tight lenses stay fast</h2>
              </div>
              <div className="grid gap-3">
                {[
                  "Switch between team-vs-team and player-vs-player",
                  "Tighten by event, time window, and map",
                  "Keep roster overlays visible when scouting teams",
                ].map((item) => (
                  <div key={item} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <section className="esports-card p-6">
          <div className="grid gap-4 xl:grid-cols-[auto,1fr,1fr,1fr,1fr]">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => switchMode("teams")}
                className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] ${mode === "teams" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}
              >
                Team vs Team
              </button>
              <button
                type="button"
                onClick={() => switchMode("players")}
                className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] ${mode === "players" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}
              >
                Player vs Player
              </button>
            </div>

            {mode === "teams" ? (
              <>
                <select
                  aria-label="First team"
                  value={teamSideA}
                  onChange={(event) => setTeamSideA(event.target.value)}
                  className="input-esports h-11"
                >
                  {dataset.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Second team"
                  value={teamSideB}
                  onChange={(event) => setTeamSideB(event.target.value)}
                  className="input-esports h-11"
                >
                  {dataset.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  aria-label="First player"
                  value={playerSideA}
                  onChange={(event) => setPlayerSideA(event.target.value)}
                  className="input-esports h-11"
                >
                  {dataset.players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.pubgName}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Second player"
                  value={playerSideB}
                  onChange={(event) => setPlayerSideB(event.target.value)}
                  className="input-esports h-11"
                >
                  {dataset.players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.pubgName}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-3">
              <select
                aria-label="Comparison period"
                value={windowMode}
                onChange={(event) => setWindowMode(event.target.value as WindowMode)}
                className="input-esports h-11"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <select
                aria-label="Comparison event"
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
                className="input-esports h-11"
              >
                <option value="all">All events</option>
                {dataset.events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Comparison map"
                value={selectedMap}
                onChange={(event) => setSelectedMap(event.target.value)}
                className="input-esports h-11"
              >
                <option value="all">All maps</option>
                {mapOptions.map((map) => (
                  <option key={map} value={map}>
                    {map}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "teams" ? (
            <label className="mt-4 inline-flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={showRosterOverlay}
                onChange={(event) => setShowRosterOverlay(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-bg-primary"
              />
              Show roster overlay
            </label>
          ) : null}
        </section>

        <IdentityPanels mode={mode} firstTeam={firstTeam} secondTeam={secondTeam} firstPlayer={firstPlayer} secondPlayer={secondPlayer} />

        {filteredMatches.length === 0 ? (
          <EmptyState
            title="No compare data in this filter"
            description="Widen the window, clear the event or map filter, or switch modes to bring the compare studio back to life."
          />
        ) : null}

        {mode === "teams" && firstTeamSummary && secondTeamSummary ? (
          <>
            <section className="esports-card p-6">
              <div className="rounded-card border border-white/[0.08] bg-bg-primary px-5 py-2">
                <CompareMetric label="Matches" leftValue={firstTeamSummary.matches} rightValue={secondTeamSummary.matches} />
                <CompareMetric label="Wins" leftValue={firstTeamSummary.wins} rightValue={secondTeamSummary.wins} />
                <CompareMetric label="Kills" leftValue={firstTeamSummary.kills} rightValue={secondTeamSummary.kills} />
                <CompareMetric
                  label="Damage"
                  leftValue={formatNumber(firstTeamSummary.damage)}
                  rightValue={formatNumber(secondTeamSummary.damage)}
                />
                <CompareMetric label="Points" leftValue={firstTeamSummary.totalPoints} rightValue={secondTeamSummary.totalPoints} />
                <CompareMetric
                  label="Avg Place"
                  leftValue={formatDecimal(firstTeamSummary.avgPlacement, 2)}
                  rightValue={formatDecimal(secondTeamSummary.avgPlacement, 2)}
                />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Shared Matches</p>
                    <p className="mt-3 font-mono-stat text-3xl text-white">{teamHeadToHead?.sharedMatches ?? 0}</p>
                  </div>
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Head-to-Head Wins</p>
                    <p className="mt-3 font-mono-stat text-white">
                      {teamHeadToHead?.firstWins ?? 0} - {teamHeadToHead?.secondWins ?? 0}
                    </p>
                  </div>
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Shared Points</p>
                    <p className="mt-3 font-mono-stat text-white">
                      {teamHeadToHead?.firstPoints ?? 0} - {teamHeadToHead?.secondPoints ?? 0}
                    </p>
                  </div>
                </div>
                <RadarComparison
                  title="Team radar signals"
                  points={teamRadarPoints}
                  firstLabel={firstTeamSummary.team.name}
                  secondLabel={secondTeamSummary.team.name}
                />
              </div>

              <div className="grid gap-6">
                <DualTrendChart
                  firstValues={firstTeamSummary.recentPoints}
                  secondValues={secondTeamSummary.recentPoints}
                  firstLabel={`${firstTeamSummary.team.name} points`}
                  secondLabel={`${secondTeamSummary.team.name} points`}
                />
                <DualTrendChart
                  firstValues={firstTeamSummary.recentKills}
                  secondValues={secondTeamSummary.recentKills}
                  firstLabel={`${firstTeamSummary.team.name} kills`}
                  secondLabel={`${secondTeamSummary.team.name} kills`}
                />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <MapEdgeTable leftLabel={firstTeamSummary.team.name} rightLabel={secondTeamSummary.team.name} rows={teamMapRows} />
              <div className="rounded-card border border-white/[0.08] bg-bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent Form</p>
                    <h3 className="mt-2 font-display text-lg font-black uppercase text-white">Latest lobby reads</h3>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[firstTeamSummary, secondTeamSummary].map((summary, index) => (
                    <div key={summary.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{summary.team.name}</p>
                        <RankBadge rank={index + 1} />
                      </div>
                      <div className="mt-3">
                        <TrendBars values={summary.recentPoints} tone={index === 0 ? "blue" : "green"} />
                      </div>
                      <div className="mt-4 space-y-3">
                        {summary.recentMatches.slice(0, 4).map((match) => {
                          const teamResult = match.teamResults.find((item) => item.teamId === summary.team.id);
                          if (!teamResult) return null;

                          return (
                            <div key={match.id} className="rounded-card border border-white/[0.08] bg-black/20 p-3">
                              <p className="font-semibold text-white">
                                {match.eventName} | {match.mapName}
                              </p>
                              <p className="mt-1 text-sm text-text-muted">
                                {formatDateTime(match.startTime)} | #{teamResult.placement} | {teamResult.kills} kills |{" "}
                                {teamResult.totalPoints} pts
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {showRosterOverlay ? (
              <section className="esports-card p-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  {[firstTeamSummary.team, secondTeamSummary.team].map((team) => (
                    <div key={team.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-lg font-black uppercase text-white">{team.name} roster overlay</h3>
                        <FormPill label={team.formLabel} />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {team.currentRoster.map((member) => (
                          <div key={member.playerId} className="rounded-card border border-white/[0.08] bg-black/20 p-3">
                            <p className="font-semibold text-white">{member.pubgName}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {mode === "players" && firstPlayerSummary && secondPlayerSummary ? (
          <>
            <section className="esports-card p-6">
              <div className="rounded-card border border-white/[0.08] bg-bg-primary px-5 py-2">
                <CompareMetric label="Matches" leftValue={firstPlayerSummary.matches} rightValue={secondPlayerSummary.matches} />
                <CompareMetric label="Wins" leftValue={firstPlayerSummary.wins} rightValue={secondPlayerSummary.wins} />
                <CompareMetric label="Kills" leftValue={firstPlayerSummary.kills} rightValue={secondPlayerSummary.kills} />
                <CompareMetric label="Assists" leftValue={firstPlayerSummary.assists} rightValue={secondPlayerSummary.assists} />
                <CompareMetric label="Knocks" leftValue={firstPlayerSummary.knocks} rightValue={secondPlayerSummary.knocks} />
                <CompareMetric
                  label="Damage"
                  leftValue={formatNumber(firstPlayerSummary.damage)}
                  rightValue={formatNumber(secondPlayerSummary.damage)}
                />
                <CompareMetric
                  label="Avg Kills"
                  leftValue={formatDecimal(firstPlayerSummary.avgKills, 2)}
                  rightValue={formatDecimal(secondPlayerSummary.avgKills, 2)}
                />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Shared Matches</p>
                    <p className="mt-3 font-mono-stat text-3xl text-white">{playerHeadToHead?.sharedMatches ?? 0}</p>
                  </div>
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Kill Edge</p>
                    <p className="mt-3 font-mono-stat text-white">
                      {playerHeadToHead?.firstKills ?? 0} - {playerHeadToHead?.secondKills ?? 0}
                    </p>
                  </div>
                  <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Damage Edge</p>
                    <p className="mt-3 font-mono-stat text-white">
                      {formatNumber(playerHeadToHead?.firstDamage ?? 0)} - {formatNumber(playerHeadToHead?.secondDamage ?? 0)}
                    </p>
                  </div>
                </div>
                <RadarComparison
                  title="Player radar signals"
                  points={playerRadarPoints}
                  firstLabel={firstPlayerSummary.player.pubgName}
                  secondLabel={secondPlayerSummary.player.pubgName}
                />
              </div>

              <div className="grid gap-6">
                <DualTrendChart
                  firstValues={firstPlayerSummary.recentKills}
                  secondValues={secondPlayerSummary.recentKills}
                  firstLabel={`${firstPlayerSummary.player.pubgName} kills`}
                  secondLabel={`${secondPlayerSummary.player.pubgName} kills`}
                />
                <DualTrendChart
                  firstValues={firstPlayerSummary.recentDamage}
                  secondValues={secondPlayerSummary.recentDamage}
                  firstLabel={`${firstPlayerSummary.player.pubgName} damage`}
                  secondLabel={`${secondPlayerSummary.player.pubgName} damage`}
                />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <MapEdgeTable
                leftLabel={firstPlayerSummary.player.pubgName}
                rightLabel={secondPlayerSummary.player.pubgName}
                rows={playerMapRows}
              />
              <div className="rounded-card border border-white/[0.08] bg-bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent Form</p>
                    <h3 className="mt-2 font-display text-lg font-black uppercase text-white">Latest player reads</h3>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[firstPlayerSummary, secondPlayerSummary].map((summary, index) => (
                    <div key={summary.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{summary.player.pubgName}</p>
                        <RankBadge rank={index + 1} />
                      </div>
                      <div className="mt-3">
                        <TrendBars values={summary.recentKills} tone={index === 0 ? "blue" : "green"} />
                      </div>
                      <div className="mt-4 space-y-3">
                        {summary.recentMatches.slice(0, 4).map((match) => {
                          const playerResult = match.playerResults.find((item) => item.playerId === summary.player.id);
                          if (!playerResult) return null;

                          return (
                            <div key={match.id} className="rounded-card border border-white/[0.08] bg-black/20 p-3">
                              <p className="font-semibold text-white">
                                {match.eventName} | {match.mapName}
                              </p>
                              <p className="mt-1 text-sm text-text-muted">
                                {formatDateTime(match.startTime)} | {playerResult.kills} kills | {playerResult.assists} assists |{" "}
                                {formatNumber(playerResult.damage)} dmg
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
