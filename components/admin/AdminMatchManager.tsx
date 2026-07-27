"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { compareMatchPlayerResults, compareMatchSequenceOrder, compareMatchTeamResults } from "@/lib/ranking-sort";
import type { MatchPlayerResult, Scrim, TeamMatchResult, Tournament, TournamentMatch } from "@/lib/types";
import {
  getUserFacingPlayerLabel,
  getUserFacingTeamLabel,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
  USER_FACING_LABELS,
} from "@/lib/user-facing-errors";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import FileUpload from "./FileUpload";

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";
const defaultPointSystemId = "00000000-0000-4000-8000-000000000001";

const pubgMaps = ["Erangel", "Miramar", "Rondo", "Taego", "Deston", "Vikendi", "Sanhok", "Karakin", "Paramo"];

type PointSystemOption = {
  id: string;
  name: string;
  active?: boolean;
};

type MatchFormState = {
  id: string;
  tournamentId: string;
  scrimId: string;
  pubgMatchId: string;
  externalMatchId: string;
  matchNumber: number;
  map: string;
  eventName: string;
  eventSlug: string;
  pointSystemId: string;
  pointSystemName: string;
  status: "draft" | "published";
  playedAt: string;
  vodUrl: string;
  sourceUrl: string;
  scoreboardImageUrl: string;
  resultImageUrl: string;
  screenshotUrls: string[];
  teamResultsText: string;
  playerResultsText: string;
};

type BulkMatchFormState = {
  matchIdsText: string;
  tournamentId: string;
  scrimId: string;
  startMatchNumber: number;
  map: string;
  eventName: string;
  eventSlug: string;
  pointSystemId: string;
  pointSystemName: string;
  status: "draft" | "published";
  playedAt: string;
  vodUrl: string;
  sourceUrl: string;
};

const defaultMatchForm: MatchFormState = {
  id: "",
  tournamentId: "",
  scrimId: "",
  pubgMatchId: "",
  externalMatchId: "",
  matchNumber: 1,
  map: "Erangel",
  eventName: "",
  eventSlug: "",
  pointSystemId: defaultPointSystemId,
  pointSystemName: "Bravo PUBG",
  status: "draft",
  playedAt: "",
  vodUrl: "",
  sourceUrl: "",
  scoreboardImageUrl: "",
  resultImageUrl: "",
  screenshotUrls: [],
  teamResultsText: "",
  playerResultsText: "",
};

const defaultBulkForm: BulkMatchFormState = {
  matchIdsText: "",
  tournamentId: "",
  scrimId: "",
  startMatchNumber: 1,
  map: "Erangel",
  eventName: "",
  eventSlug: "",
  pointSystemId: defaultPointSystemId,
  pointSystemName: "Bravo PUBG",
  status: "draft",
  playedAt: "",
  vodUrl: "",
  sourceUrl: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toFiniteNumber(value: string | number | undefined, fallback = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function placementPointsForPlacement(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 5;
  if (placement === 4) return 4;
  if (placement === 5) return 3;
  if (placement === 6) return 2;
  if (placement === 7 || placement === 8) return 1;
  return 0;
}

function splitDelimitedLines(value: string) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDateTimeValue(value: string) {
  if (!value.trim()) return undefined;
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
}

function formatDateTimeLocalInput(value?: string) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  const offsetDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function parseTeamResults(value: string) {
  return splitDelimitedLines(value)
    .map((line) => {
      const [
        teamName = "",
        slotNumber = "",
        placement = "",
        kills = "",
        damage = "",
        placementPoints = "",
        killPoints = "",
        totalPoints = "",
      ] = line.split("|").map((part) => part.trim());
      const normalizedPlacement = toFiniteNumber(placement);
      const normalizedKills = toFiniteNumber(kills);
      const normalizedPlacementPoints = placementPoints
        ? toFiniteNumber(placementPoints)
        : placementPointsForPlacement(normalizedPlacement);
      const normalizedKillPoints = killPoints ? toFiniteNumber(killPoints) : normalizedKills;
      return {
        teamName: getUserFacingTeamLabel(teamName, USER_FACING_LABELS.teamPendingMapping),
        slotNumber: slotNumber ? toFiniteNumber(slotNumber) : undefined,
        placement: normalizedPlacement,
        kills: normalizedKills,
        damage: toFiniteNumber(damage),
        placementPoints: normalizedPlacementPoints,
        killPoints: normalizedKillPoints,
        totalPoints: totalPoints ? toFiniteNumber(totalPoints) : normalizedPlacementPoints + normalizedKillPoints,
      } satisfies TeamMatchResult;
    })
    .sort((firstResult, secondResult) => compareMatchTeamResults(firstResult, secondResult));
}

function parsePlayerResults(value: string, teamResults: TeamMatchResult[]) {
  const teamPlacementByName = new Map(teamResults.map((teamResult) => [teamResult.teamName.toLowerCase(), teamResult.placement] as const));

  return splitDelimitedLines(value)
    .map((line) => {
      const [
        playerName = "",
        teamName = "",
        kills = "",
        assists = "",
        knocks = "",
        damage = "",
        placement = "",
        playerId = "",
        pubgPlayerId = "",
        survivalTime = "",
      ] = line.split("|").map((part) => part.trim());
      const normalizedTeamName = getUserFacingTeamLabel(teamName, USER_FACING_LABELS.teamPendingMapping);
      const fallbackPlacement = teamPlacementByName.get(normalizedTeamName.toLowerCase()) ?? 0;
      const normalizedKills = toFiniteNumber(kills);
      const normalizedAssists = toFiniteNumber(assists);
      const normalizedKnocks = toFiniteNumber(knocks);

      return {
        playerId: playerId || pubgPlayerId || slugify(playerName || "player"),
        playerName: getUserFacingPlayerLabel(playerName, USER_FACING_LABELS.playerPendingMapping),
        pubgPlayerId: pubgPlayerId || undefined,
        teamName: normalizedTeamName,
        placement: placement ? toFiniteNumber(placement) : fallbackPlacement,
        kills: normalizedKills,
        assists: normalizedAssists,
        knocks: normalizedKnocks,
        damage: toFiniteNumber(damage),
        survivalTime: toFiniteNumber(survivalTime),
        placementPoints: 0,
        totalPoints: normalizedKills + normalizedAssists + normalizedKnocks,
      } satisfies MatchPlayerResult;
    })
    .sort((firstResult, secondResult) => compareMatchPlayerResults(firstResult, secondResult));
}

function serializeTeamResults(teamResults?: TeamMatchResult[]) {
  return (teamResults ?? [])
    .map((teamResult) =>
      [
        teamResult.teamName,
        teamResult.slotNumber ?? "",
        teamResult.placement,
        teamResult.kills,
        teamResult.damage,
        teamResult.placementPoints,
        teamResult.killPoints,
        teamResult.totalPoints,
      ].join("|"),
    )
    .join("\n");
}

function serializePlayerResults(playerResults?: MatchPlayerResult[]) {
  return (playerResults ?? [])
    .map((playerResult) =>
      [
        playerResult.playerName,
        playerResult.teamName,
        playerResult.kills,
        playerResult.assists,
        playerResult.knocks,
        playerResult.damage,
        playerResult.placement,
        playerResult.playerId,
        playerResult.pubgPlayerId ?? "",
        playerResult.survivalTime,
      ].join("|"),
    )
    .join("\n");
}

function buildMatchForm(match: TournamentMatch): MatchFormState {
  return {
    id: match.id,
    tournamentId: match.tournamentId ?? "",
    scrimId: match.scrimId ?? "",
    pubgMatchId: match.pubgMatchId,
    externalMatchId: match.externalMatchId ?? "",
    matchNumber: match.matchNumber ?? match.sequenceNumber ?? 1,
    map: match.map,
    eventName: match.eventName ?? "",
    eventSlug: match.eventSlug ?? "",
    pointSystemId: match.pointSystemId ?? defaultPointSystemId,
    pointSystemName: match.pointSystemName ?? "Bravo PUBG",
    status: match.status === "draft" ? "draft" : "published",
    playedAt: formatDateTimeLocalInput(match.playedAt),
    vodUrl: match.vodUrl ?? "",
    sourceUrl: match.sourceUrl ?? "",
    scoreboardImageUrl: match.scoreboardImageUrl ?? "",
    resultImageUrl: match.resultImageUrl ?? match.resultScreenshotUrl ?? "",
    screenshotUrls: match.screenshotUrls ?? [],
    teamResultsText: serializeTeamResults(match.teamResults),
    playerResultsText: serializePlayerResults(match.playerResults),
  };
}

function MessageLine({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null;

  return (
    <div
      className={`rounded-card border px-4 py-3 text-sm ${
        error ? "border-bravoRed/30 bg-bravoRed/10 text-red-200" : "border-accent-green/30 bg-accent-green/10 text-green-200"
      }`}
    >
      {error ?? message}
    </div>
  );
}

export default function AdminMatchManager({
  tournaments,
  scrims,
  onChanged,
}: {
  tournaments: Tournament[];
  scrims: Scrim[];
  onChanged?: () => void | Promise<void>;
}) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [pointSystems, setPointSystems] = useState<PointSystemOption[]>([]);
  const [form, setForm] = useState<MatchFormState>(defaultMatchForm);
  const [bulkForm, setBulkForm] = useState<BulkMatchFormState>(defaultBulkForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [busyMatchActionId, setBusyMatchActionId] = useState<string | null>(null);
  const [serverPreview, setServerPreview] = useState<TournamentMatch | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMatches() {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/matches");
      const loadedMatches = ((response.data?.matches ?? []) as TournamentMatch[]).sort((firstMatch, secondMatch) =>
        compareMatchSequenceOrder(secondMatch, firstMatch),
      );
      const loadedPointSystems = (response.data?.pointSystems ?? []) as PointSystemOption[];
      setMatches(loadedMatches);
      setPointSystems(loadedPointSystems);
    } catch (loadError: unknown) {
      setError(
        toUserFacingErrorMessage(loadError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return scheduleEffectTask(loadMatches);
  }, []);

  const previewTeamResults = useMemo(() => parseTeamResults(form.teamResultsText), [form.teamResultsText]);
  const previewPlayerResults = useMemo(
    () => parsePlayerResults(form.playerResultsText, previewTeamResults),
    [form.playerResultsText, previewTeamResults],
  );
  const previewWinner = previewTeamResults.find((teamResult) => teamResult.placement === 1)?.teamName ?? "Winner Pending";
  const activePreview = serverPreview ?? {
    id: form.id || "match-preview",
    pubgMatchId: form.pubgMatchId,
    matchNumber: form.matchNumber,
    map: form.map,
    eventName: form.eventName,
    status: form.status,
    winner: previewWinner,
    points: previewTeamResults[0]?.totalPoints ?? 0,
    knockouts: previewTeamResults.reduce((sum, teamResult) => sum + teamResult.kills, 0),
    dataSource: "manual_correction" as const,
    teamResults: previewTeamResults,
    playerResults: previewPlayerResults,
    pointSystemId: form.pointSystemId,
    pointSystemName: form.pointSystemName,
  };
  const uploadEntityId = editingId || form.pubgMatchId.trim() || "match-draft";

  function resetForm() {
    setEditingId(null);
    setForm(defaultMatchForm);
    setServerPreview(null);
  }

  async function refreshAfterMutation(successMessage: string) {
    setMessage(successMessage);
    await loadMatches();
    await onChanged?.();
  }

  function buildPayload(status: MatchFormState["status"]) {
    return {
      id: form.id || undefined,
      tournamentId: form.tournamentId || undefined,
      scrimId: form.scrimId || undefined,
      pubgMatchId: form.pubgMatchId.trim() || undefined,
      externalMatchId: form.externalMatchId || undefined,
      sequenceNumber: form.matchNumber,
      matchNumber: form.matchNumber,
      map: form.map,
      eventName: form.eventName || undefined,
      eventSlug: form.eventSlug || slugify(form.eventName),
      pointSystemId: form.pointSystemId || undefined,
      pointSystemName: form.pointSystemName || undefined,
      status,
      playedAt: normalizeDateTimeValue(form.playedAt),
      vodUrl: form.vodUrl || undefined,
      sourceUrl: form.sourceUrl || undefined,
      scoreboardImageUrl: form.scoreboardImageUrl || undefined,
      resultImageUrl: form.resultImageUrl || undefined,
      screenshotUrls: form.screenshotUrls,
      teamResults: previewTeamResults,
      playerResults: previewPlayerResults,
      dataSource: "manual_correction",
    } satisfies Partial<TournamentMatch> & { map: string };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistMatch(form.status);
  }

  async function handlePreview() {
    if (!form.tournamentId.trim() || !form.map.trim()) {
      setError("Event and map are required before previewing.");
      return;
    }

    setPreviewing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/matches/preview", {
        method: "POST",
        body: JSON.stringify(buildPayload(form.status)),
      });
      const preview = response.data as TournamentMatch;
      setServerPreview(preview);
      setForm((currentForm) => ({
        ...currentForm,
        pointSystemId: preview.pointSystemId ?? currentForm.pointSystemId,
        pointSystemName: preview.pointSystemName ?? currentForm.pointSystemName,
        eventName: preview.eventName ?? currentForm.eventName,
        eventSlug: preview.eventSlug ?? currentForm.eventSlug,
      }));
      setMessage("Preview refreshed with the active point system.");
    } catch (previewError: unknown) {
      setError(
        toUserFacingErrorMessage(previewError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function persistMatch(status: MatchFormState["status"]) {
    if (!form.tournamentId.trim() || !form.map.trim()) {
      setError("Event and map are required.");
      return;
    }

    const existingEditingMatch = editingId ? (matches.find((match) => match.id === editingId) ?? null) : null;
    if (
      existingEditingMatch?.pubgMatchId?.trim() &&
      form.pubgMatchId.trim() &&
      existingEditingMatch.pubgMatchId.trim() !== form.pubgMatchId.trim() &&
      !window.confirm("Replace the existing PUBG Match ID for this slot?")
    ) {
      return;
    }

    const setBusyState = status === "published" ? setPublishing : setSaving;
    setBusyState(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/matches", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(buildPayload(status)),
      });

      setServerPreview((response.data ?? null) as TournamentMatch | null);
      await refreshAfterMutation(
        editingId
          ? status === "published"
            ? "Match updated and published."
            : "Match updated."
          : status === "published"
            ? "Match created and published."
            : "Match created.",
      );
      resetForm();
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setBusyState(false);
    }
  }

  async function handleBulkCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchIds = Array.from(
      new Set(
        bulkForm.matchIdsText
          .split(/[\n,]+/g)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (matchIds.length === 0) {
      setError("Add at least one match reference for the shell creation flow.");
      return;
    }

    if (!bulkForm.tournamentId.trim()) {
      setError("Select an event before creating match shells.");
      return;
    }

    setBulkSaving(true);
    setMessage(null);
    setError(null);

    try {
      const matchesPayload = matchIds.map((matchId, index) => ({
        id: undefined,
        tournamentId: bulkForm.tournamentId || undefined,
        scrimId: bulkForm.scrimId || undefined,
        pubgMatchId: matchId,
        matchNumber: bulkForm.startMatchNumber + index,
        sequenceNumber: bulkForm.startMatchNumber + index,
        map: bulkForm.map,
        eventName: bulkForm.eventName || undefined,
        eventSlug: bulkForm.eventSlug || slugify(bulkForm.eventName),
        pointSystemId: bulkForm.pointSystemId || undefined,
        pointSystemName: bulkForm.pointSystemName || undefined,
        status: bulkForm.status,
        playedAt: normalizeDateTimeValue(bulkForm.playedAt),
        vodUrl: bulkForm.vodUrl || undefined,
        sourceUrl: bulkForm.sourceUrl || undefined,
        dataSource: "manual_correction",
        teamResults: [],
        playerResults: [],
      }));

      await adminFetch("/api/admin/matches", {
        method: "POST",
        body: JSON.stringify({ matches: matchesPayload }),
      });

      setBulkForm(defaultBulkForm);
      await refreshAfterMutation(`${matchIds.length} match shell${matchIds.length === 1 ? "" : "s"} created.`);
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleTogglePublished(match: TournamentMatch) {
    setBusyMatchActionId(match.id);
    try {
      await adminFetch("/api/admin/matches", {
        method: "PUT",
        body: JSON.stringify({
          id: match.id,
          action: match.status === "draft" ? "publish" : "unpublish",
        }),
      });
      await refreshAfterMutation(match.status === "draft" ? "Match published." : "Match moved back to draft.");
    } catch (toggleError: unknown) {
      setError(
        toUserFacingErrorMessage(toggleError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setBusyMatchActionId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this match record from admin and public views?")) {
      return;
    }

    try {
      await adminFetch(`/api/admin/matches?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (editingId === id) {
        resetForm();
      }
      await refreshAfterMutation("Match deleted.");
    } catch (deleteError: unknown) {
      setError(
        toUserFacingErrorMessage(deleteError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    }
  }

  async function handleRecalculate(id: string) {
    setBusyMatchActionId(id);
    setMessage(null);
    setError(null);

    try {
      await adminFetch("/api/admin/matches", {
        method: "PUT",
        body: JSON.stringify({ id, action: "recalculate" }),
      });
      await refreshAfterMutation("Match recalculated.");
    } catch (recalculateError: unknown) {
      setError(
        toUserFacingErrorMessage(recalculateError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setBusyMatchActionId(null);
    }
  }

  async function handleRollback(id: string) {
    setBusyMatchActionId(id);
    setMessage(null);
    setError(null);

    try {
      await adminFetch("/api/admin/matches", {
        method: "PUT",
        body: JSON.stringify({ id, action: "rollback" }),
      });
      await refreshAfterMutation("Match rolled back to the latest audited snapshot.");
    } catch (rollbackError: unknown) {
      setError(
        toUserFacingErrorMessage(rollbackError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setBusyMatchActionId(null);
    }
  }

  function startEdit(match: TournamentMatch) {
    setEditingId(match.id);
    setForm(buildMatchForm(match));
    setServerPreview(match);
    setMessage(null);
    setError(null);
  }

  const tournamentOptions = tournaments
    .filter((tournament) => Boolean(tournament.title))
    .sort((firstTournament, secondTournament) => firstTournament.title.localeCompare(secondTournament.title));
  const scrimOptions = scrims
    .filter((scrim) => Boolean(scrim.title))
    .sort((firstScrim, secondScrim) => firstScrim.title.localeCompare(secondScrim.title));
  const selectedPointSystem =
    pointSystems.find((pointSystem) => pointSystem.id === form.pointSystemId) ??
    (form.pointSystemId
      ? {
          id: form.pointSystemId,
          name: form.pointSystemName || "Selected point system",
        }
      : null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Match Manager</h2>
        <p className="mt-1 text-sm text-text-muted">
          Create manual matches, score results with the active point system, preview before publishing, and manage recalculation or rollback
          from one place.
        </p>
      </div>

      <MessageLine message={message} error={error} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <form onSubmit={handleSubmit} className="esports-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{editingId ? "Edit match" : "Create match"}</p>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary !text-[11px]">
                New match
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Match reference / optional PUBG Match ID"
              value={form.pubgMatchId}
              onChange={(event) => setForm({ ...form, pubgMatchId: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="External Match ID"
              value={form.externalMatchId}
              onChange={(event) => setForm({ ...form, externalMatchId: event.target.value })}
            />
            <select className={inputClass} value={form.map} onChange={(event) => setForm({ ...form, map: event.target.value })}>
              {pubgMaps.map((mapName) => (
                <option key={mapName} value={mapName}>
                  {mapName}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.matchNumber}
              onChange={(event) =>
                setForm({
                  ...form,
                  matchNumber: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
            <input
              className={inputClass}
              placeholder="Event name"
              value={form.eventName}
              onChange={(event) => setForm({ ...form, eventName: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Event slug"
              value={form.eventSlug}
              onChange={(event) => setForm({ ...form, eventSlug: event.target.value })}
            />
            <select
              className={inputClass}
              value={form.tournamentId}
              onChange={(event) => setForm({ ...form, tournamentId: event.target.value })}
            >
              <option value="">Select event (required)</option>
              {tournamentOptions.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={form.pointSystemId}
              onChange={(event) => {
                const nextPointSystem = pointSystems.find((pointSystem) => pointSystem.id === event.target.value) ?? null;
                setForm({
                  ...form,
                  pointSystemId: event.target.value,
                  pointSystemName: nextPointSystem?.name ?? form.pointSystemName,
                });
              }}
            >
              <option value={defaultPointSystemId}>Default Bravo point system</option>
              {pointSystems.map((pointSystem) => (
                <option key={pointSystem.id} value={pointSystem.id}>
                  {pointSystem.name}
                  {pointSystem.active ? " (Active)" : ""}
                </option>
              ))}
            </select>
            <select className={inputClass} value={form.scrimId} onChange={(event) => setForm({ ...form, scrimId: event.target.value })}>
              <option value="">Scrim link (optional)</option>
              {scrimOptions.map((scrim) => (
                <option key={scrim.id} value={scrim.id}>
                  {scrim.title}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              type="datetime-local"
              value={form.playedAt}
              onChange={(event) => setForm({ ...form, playedAt: event.target.value })}
            />
            <select
              className={inputClass}
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as MatchFormState["status"],
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <input
              className={inputClass}
              placeholder="VOD / YouTube URL"
              value={form.vodUrl}
              onChange={(event) => setForm({ ...form, vodUrl: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Source URL"
              value={form.sourceUrl}
              onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
            />
          </div>

          <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-xs text-text-muted">
            {selectedPointSystem ? `Point system: ${selectedPointSystem.name}` : "Point system will be resolved on preview."}
          </div>

          <div className="grid gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Team results</p>
              <textarea
                className={inputClass}
                rows={7}
                placeholder="Team Name|Slot|Placement|Kills|Damage|PlacementPts|KillPts|TotalPts"
                value={form.teamResultsText}
                onChange={(event) => setForm({ ...form, teamResultsText: event.target.value })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Player results</p>
              <textarea
                className={inputClass}
                rows={8}
                placeholder="Player Name|Team Name|Kills|Assists|Knocks|Damage|Placement|Player ID|PUBG Player ID|Survival Seconds"
                value={form.playerResultsText}
                onChange={(event) => setForm({ ...form, playerResultsText: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FileUpload
              type="scoreboard_image"
              entityId={uploadEntityId}
              label="Scoreboard image"
              currentUrl={form.scoreboardImageUrl || undefined}
              onUploaded={(url) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  scoreboardImageUrl: url,
                }))
              }
            />
            <FileUpload
              type="result_screenshot"
              entityId={uploadEntityId}
              label="Result poster"
              currentUrl={form.resultImageUrl || undefined}
              onUploaded={(url) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  resultImageUrl: url,
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <FileUpload
              type="match_screenshot"
              entityId={uploadEntityId}
              label="Add extra screenshot"
              currentUrl={form.screenshotUrls[form.screenshotUrls.length - 1]}
              onUploaded={(url) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  screenshotUrls: Array.from(new Set([...currentForm.screenshotUrls, url])),
                }))
              }
            />
            {form.screenshotUrls.length > 0 ? (
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Saved screenshots</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {form.screenshotUrls.map((url) => (
                    <div key={url} className="relative">
                      <Image
                        src={url}
                        alt="Match screenshot"
                        width={80}
                        height={80}
                        unoptimized
                        className="h-20 w-20 rounded-card border border-white/10 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            screenshotUrls: currentForm.screenshotUrls.filter((item) => item !== url),
                          }))
                        }
                        className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-bg-card px-2 py-1 text-[10px] font-bold text-white"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editingId ? "Save Draft" : "Create Draft"}
            </button>
            <button type="button" onClick={() => void handlePreview()} disabled={previewing} className="btn-secondary">
              {previewing ? "Previewing..." : "Preview"}
            </button>
            <button type="button" onClick={() => void persistMatch("published")} disabled={publishing} className={btnPrimary}>
              {publishing ? "Publishing..." : editingId ? "Update & Publish" : "Create & Publish"}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Clear Form
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="esports-card p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">Publish preview</p>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  form.status === "published"
                    ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                    : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
                }`}
              >
                {form.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match</p>
                <p className="mt-2 font-semibold text-white">
                  #{form.matchNumber} | {form.map}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {activePreview.pubgMatchId || "Internal match reference will be generated on save."}
                </p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Winner</p>
                <p className="mt-2 font-semibold text-white">{activePreview.winner}</p>
                <p className="mt-1 text-xs text-text-muted">{activePreview.eventName || form.eventName || "Event context pending"}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
                <p className="mt-2 font-mono-stat text-white">{activePreview.teamResults?.length ?? 0}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Players</p>
                <p className="mt-2 font-mono-stat text-white">{activePreview.playerResults?.length ?? 0}</p>
              </div>
            </div>

            {serverPreview ? (
              <p className="mt-5 text-sm text-text-muted">
                Server preview is ready. If you change the form, run Preview again before publishing.
              </p>
            ) : null}

            {(activePreview.teamResults?.length ?? 0) === 0 ? (
              <p className="mt-5 text-sm text-text-muted">
                Add team and player lines, then run Preview to score the match before publishing.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="table-scroll">
                  <table className="data-table min-w-full text-xs">
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Place</th>
                        <th>K</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activePreview.teamResults ?? []).map((teamResult) => (
                        <tr key={`${activePreview.pubgMatchId || "preview"}-${teamResult.teamName}`}>
                          <td>{teamResult.teamName}</td>
                          <td>#{teamResult.placement}</td>
                          <td>{teamResult.kills}</td>
                          <td className="points-cell">{teamResult.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(activePreview.playerResults?.length ?? 0) > 0 ? (
                  <div className="table-scroll">
                    <table className="data-table min-w-full text-xs">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Team</th>
                          <th>K</th>
                          <th>A</th>
                          <th>Kn</th>
                          <th>Dmg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activePreview.playerResults ?? []).slice(0, 8).map((playerResult) => (
                          <tr key={`${activePreview.pubgMatchId || "preview"}-${playerResult.playerId}`}>
                            <td>{playerResult.playerName}</td>
                            <td>{playerResult.teamName}</td>
                            <td>{playerResult.kills}</td>
                            <td>{playerResult.assists}</td>
                            <td>{playerResult.knocks}</td>
                            <td>{playerResult.damage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <form onSubmit={handleBulkCreate} className="esports-card space-y-4 p-6">
            <div>
              <p className="font-semibold text-white">Bulk create match shells</p>
              <p className="mt-1 text-sm text-text-muted">
                Paste one or many optional match references or PUBG IDs to create shells first, then enrich each match from the editor.
              </p>
            </div>
            <textarea
              className={inputClass}
              rows={6}
              placeholder="match.one&#10;match.two&#10;match.three"
              value={bulkForm.matchIdsText}
              onChange={(event) => setBulkForm({ ...bulkForm, matchIdsText: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className={inputClass}
                value={bulkForm.map}
                onChange={(event) => setBulkForm({ ...bulkForm, map: event.target.value })}
              >
                {pubgMaps.map((mapName) => (
                  <option key={mapName} value={mapName}>
                    {mapName}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={bulkForm.startMatchNumber}
                onChange={(event) =>
                  setBulkForm({
                    ...bulkForm,
                    startMatchNumber: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
              <input
                className={inputClass}
                placeholder="Event name"
                value={bulkForm.eventName}
                onChange={(event) => setBulkForm({ ...bulkForm, eventName: event.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Event slug"
                value={bulkForm.eventSlug}
                onChange={(event) => setBulkForm({ ...bulkForm, eventSlug: event.target.value })}
              />
              <select
                className={inputClass}
                value={bulkForm.tournamentId}
                onChange={(event) => setBulkForm({ ...bulkForm, tournamentId: event.target.value })}
              >
                <option value="">Select event (required)</option>
                {tournamentOptions.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={bulkForm.pointSystemId}
                onChange={(event) => {
                  const nextPointSystem = pointSystems.find((pointSystem) => pointSystem.id === event.target.value) ?? null;
                  setBulkForm({
                    ...bulkForm,
                    pointSystemId: event.target.value,
                    pointSystemName: nextPointSystem?.name ?? bulkForm.pointSystemName,
                  });
                }}
              >
                <option value={defaultPointSystemId}>Default Bravo point system</option>
                {pointSystems.map((pointSystem) => (
                  <option key={pointSystem.id} value={pointSystem.id}>
                    {pointSystem.name}
                    {pointSystem.active ? " (Active)" : ""}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={bulkForm.scrimId}
                onChange={(event) => setBulkForm({ ...bulkForm, scrimId: event.target.value })}
              >
                <option value="">Scrim link (optional)</option>
                {scrimOptions.map((scrim) => (
                  <option key={scrim.id} value={scrim.id}>
                    {scrim.title}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                type="datetime-local"
                value={bulkForm.playedAt}
                onChange={(event) => setBulkForm({ ...bulkForm, playedAt: event.target.value })}
              />
              <select
                className={inputClass}
                value={bulkForm.status}
                onChange={(event) =>
                  setBulkForm({
                    ...bulkForm,
                    status: event.target.value as BulkMatchFormState["status"],
                  })
                }
              >
                <option value="draft">Draft shells</option>
                <option value="published">Publish immediately</option>
              </select>
              <input
                className={inputClass}
                placeholder="Shared VOD URL"
                value={bulkForm.vodUrl}
                onChange={(event) => setBulkForm({ ...bulkForm, vodUrl: event.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Shared source URL"
                value={bulkForm.sourceUrl}
                onChange={(event) => setBulkForm({ ...bulkForm, sourceUrl: event.target.value })}
              />
            </div>
            <button type="submit" disabled={bulkSaving} className={btnPrimary}>
              {bulkSaving ? "Creating..." : "Create Multiple Matches"}
            </button>
          </form>
        </div>
      </div>

      <div className="esports-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Stored matches</p>
            <p className="mt-1 text-sm text-text-muted">
              Published matches flow to public results, standings, and player or team statistics. Drafts stay private until you publish
              them.
            </p>
          </div>
          <button type="button" onClick={() => void loadMatches()} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-text-muted">Loading matches...</p>
        ) : matches.length === 0 ? (
          <div className="mt-5 rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
            Match data will appear once results are published.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      Match #{match.matchNumber ?? match.sequenceNumber ?? "-"} | {match.map}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {match.eventName ?? "Standalone match"} | {match.pubgMatchId} | {match.status === "draft" ? "draft" : "published"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button type="button" onClick={() => startEdit(match)} className="text-accent-blue hover:underline">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePublished(match)}
                      disabled={busyMatchActionId === match.id}
                      className="text-accent-green hover:underline disabled:opacity-60"
                    >
                      {match.status === "draft" ? "Publish" : "Unpublish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRecalculate(match.id)}
                      disabled={busyMatchActionId === match.id}
                      className="text-accent-yellow hover:underline disabled:opacity-60"
                    >
                      Recalculate
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRollback(match.id)}
                      disabled={busyMatchActionId === match.id}
                      className="text-text-muted hover:underline disabled:opacity-60"
                    >
                      Rollback
                    </button>
                    {match.status !== "draft" ? (
                      <Link href={`/pubg/matches/${match.id}`} target="_blank" className="text-text-muted hover:underline">
                        Open Public
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(match.id)}
                      disabled={match.status !== "draft"}
                      className="text-bravoRed hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Winner</p>
                    <p className="mt-1 text-sm text-white">{match.winner}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Teams</p>
                    <p className="mt-1 text-sm text-white">{match.teamResults?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Players</p>
                    <p className="mt-1 text-sm text-white">{match.playerResults?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Assets</p>
                    <p className="mt-1 text-sm text-white">
                      {[match.scoreboardImageUrl, match.resultImageUrl, ...(match.screenshotUrls ?? [])].filter(Boolean).length}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
