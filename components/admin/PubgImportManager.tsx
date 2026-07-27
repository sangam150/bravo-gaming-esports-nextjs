"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { buildFallbackTeamNameFromSlot, parseBravoSlotNumber, resolveBravoTeamIdentity } from "@/lib/bravo-teams";
import { formatDisplayDateTime } from "@/lib/display-format";
import { compareMatchPlayerResults, compareMatchTeamResults } from "@/lib/ranking-sort";
import type {
  MatchPlayerResult,
  PubgBulkImportResult,
  PubgBulkPreviewResult,
  PubgDuplicateMode,
  PubgImportBatchPreviewMatch,
  PubgImportCandidate,
  PubgImportEdit,
  PubgImportPreview,
  PubgImportWatcher,
  PubgPlayerLookup,
  Scrim,
  Season,
  TeamMatchResult,
  Tournament,
} from "@/lib/types";
import { getUserFacingTeamLabel, toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES, USER_FACING_LABELS } from "@/lib/user-facing-errors";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import FileUpload from "./FileUpload";

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";
const btnSecondary = "btn-secondary disabled:opacity-60";
const defaultMapRotation = "Rondo, Erangel, Miramar, Taego";
const pubgMaps = ["Rondo", "Erangel", "Miramar", "Taego", "Deston", "Vikendi", "Sanhok", "Karakin", "Paramo"];
const defaultSeasonSeriesTitle = "BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS";
const kathmanduDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const kathmanduTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type EditablePreview = PubgImportPreview & {
  sourceMatchId: string;
  matchId: string;
  matchNumber: number;
  matchDate: string;
  matchTime: string;
  map: string;
  teamResults: TeamMatchResult[];
  playerResults: MatchPlayerResult[];
};

type SeasonDraft = {
  title: string;
  seriesTitle: string;
  seasonNumber: number;
  startDate: string;
  configuredDays: number;
  status: Season["status"];
  game: string;
  format: string;
  region: string;
  perspective: string;
};

function toFiniteNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolvePreviewTeamAssignment(teamName?: string, slotNumber?: number, preferredField: "teamName" | "slotNumber" = "teamName") {
  const trimmedTeamName = teamName?.trim();
  const safeSlotNumber = toFiniteNumber(slotNumber);
  const resolvedByName = trimmedTeamName ? resolveBravoTeamIdentity(trimmedTeamName) : null;
  const resolvedBySlot =
    typeof safeSlotNumber === "number"
      ? (resolveBravoTeamIdentity(`slot ${safeSlotNumber}`) ?? resolveBravoTeamIdentity(String(safeSlotNumber)))
      : null;
  const resolvedTeam = preferredField === "slotNumber" ? (resolvedBySlot ?? resolvedByName) : (resolvedByName ?? resolvedBySlot);
  const inferredSlotNumber = resolvedTeam?.slotNumber ?? safeSlotNumber ?? parseBravoSlotNumber(trimmedTeamName);

  return {
    teamId: resolvedTeam?.id,
    teamName: getUserFacingTeamLabel(
      resolvedTeam?.name ?? trimmedTeamName ?? buildFallbackTeamNameFromSlot(inferredSlotNumber),
      USER_FACING_LABELS.teamPendingMapping,
    ),
    slotNumber: inferredSlotNumber,
  };
}

function normalizeMatchIds(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\n,]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeMapRotation(value?: string) {
  return (value ?? "")
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSeasonDraft(seasonNumber: number): SeasonDraft {
  return {
    title: `${defaultSeasonSeriesTitle} Season ${seasonNumber}`,
    seriesTitle: defaultSeasonSeriesTitle,
    seasonNumber,
    startDate: getTodayInKathmandu(),
    configuredDays: 15,
    status: "active",
    game: "PUBG PC",
    format: "Squad",
    region: "Global",
    perspective: "TPP",
  };
}

function addDays(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function getTodayInKathmandu() {
  const dateParts = kathmanduDateFormatter.formatToParts(new Date());
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function formatKathmanduDateInput(value?: string) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const parts = kathmanduDateFormatter.formatToParts(parsedDate);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function formatKathmanduTimeInput(value?: string) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return kathmanduTimeFormatter.format(parsedDate);
}

function buildPlayedAtValue(date: string, time: string) {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  if (!normalizedDate) return undefined;

  const safeTime = normalizedTime || "20:00";
  return `${normalizedDate}T${safeTime}:00+05:45`;
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

function normalizePreviewTeamResult(teamResult: TeamMatchResult, preferredField: "teamName" | "slotNumber" = "teamName"): TeamMatchResult {
  const assignment = resolvePreviewTeamAssignment(teamResult.teamName, teamResult.slotNumber, preferredField);
  const placement = Number.isFinite(teamResult.placement) ? Number(teamResult.placement) : 0;
  const kills = Number.isFinite(teamResult.kills) ? Number(teamResult.kills) : 0;
  const placementPointsValue = Number.isFinite(teamResult.placementPoints)
    ? Number(teamResult.placementPoints)
    : placementPointsForPlacement(placement);
  const killPointsValue = Number.isFinite(teamResult.killPoints) ? Number(teamResult.killPoints) : kills;

  return {
    ...teamResult,
    teamId: assignment.teamId ?? teamResult.teamId,
    teamName: assignment.teamName,
    slotNumber: assignment.slotNumber,
    placement,
    kills,
    damage: Number.isFinite(teamResult.damage) ? Number(teamResult.damage) : 0,
    placementPoints: placementPointsValue,
    killPoints: killPointsValue,
    totalPoints: placementPointsValue + killPointsValue,
  };
}

function normalizePreviewPlayerResult(
  playerResult: MatchPlayerResult,
  teamResults: TeamMatchResult[],
  preferredField: "teamName" | "slotNumber" = "teamName",
): MatchPlayerResult {
  const assignment = resolvePreviewTeamAssignment(playerResult.teamName, playerResult.slotNumber, preferredField);
  const matchedTeam =
    teamResults.find(
      (teamResult) =>
        (assignment.slotNumber && teamResult.slotNumber === assignment.slotNumber) ||
        teamResult.teamName.trim().toLowerCase() === assignment.teamName.trim().toLowerCase(),
    ) ?? null;
  const placement = Number.isFinite(playerResult.placement) ? Number(playerResult.placement) : (matchedTeam?.placement ?? 0);
  const placementPointsValue = Number.isFinite(playerResult.placementPoints)
    ? Number(playerResult.placementPoints)
    : (matchedTeam?.placementPoints ?? placementPointsForPlacement(placement));
  const kills = Number.isFinite(playerResult.kills) ? Number(playerResult.kills) : 0;

  return {
    ...playerResult,
    teamId: assignment.teamId ?? matchedTeam?.teamId ?? playerResult.teamId,
    teamName: matchedTeam?.teamName ?? assignment.teamName,
    slotNumber: matchedTeam?.slotNumber ?? assignment.slotNumber,
    placement,
    kills,
    assists: Number.isFinite(playerResult.assists) ? Number(playerResult.assists) : 0,
    knocks: Number.isFinite(playerResult.knocks) ? Number(playerResult.knocks) : 0,
    damage: Number.isFinite(playerResult.damage) ? Number(playerResult.damage) : 0,
    survivalTime: Number.isFinite(playerResult.survivalTime) ? Number(playerResult.survivalTime) : 0,
    placementPoints: placementPointsValue,
    totalPoints: placementPointsValue + kills,
  };
}

function sortTeamResultsByPlacement(results: TeamMatchResult[]) {
  return [...results].sort((firstResult, secondResult) => compareMatchTeamResults(firstResult, secondResult));
}

function sortPlayerResultsByPlacement(results: MatchPlayerResult[]) {
  return [...results].sort((firstResult, secondResult) => compareMatchPlayerResults(firstResult, secondResult));
}

function normalizePreviewResults(teamResults: TeamMatchResult[], playerResults: MatchPlayerResult[]) {
  const normalizedTeamResults = sortTeamResultsByPlacement(teamResults.map((teamResult) => normalizePreviewTeamResult(teamResult)));
  const normalizedPlayerResults = sortPlayerResultsByPlacement(
    playerResults.map((playerResult) => normalizePreviewPlayerResult(playerResult, normalizedTeamResults)),
  );

  return {
    teamResults: normalizedTeamResults,
    playerResults: normalizedPlayerResults,
  };
}

function createEditablePreview(preview: PubgImportPreview): EditablePreview {
  const matchDate = formatKathmanduDateInput(preview.summary.createdAt);
  const matchTime = formatKathmanduTimeInput(preview.summary.createdAt);
  const normalizedResults = normalizePreviewResults(
    preview.teamResults.map((teamResult) => ({ ...teamResult })),
    preview.playerResults.map((playerResult) => ({ ...playerResult })),
  );

  return {
    ...preview,
    sourceMatchId: preview.matchId,
    matchId: preview.matchId,
    matchNumber: preview.matchNumber ?? 1,
    matchDate,
    matchTime,
    map: preview.summary.mapName ?? "Unknown",
    teamResults: normalizedResults.teamResults,
    playerResults: normalizedResults.playerResults,
  };
}

function sortTournamentsByDay(firstTournament: Tournament, secondTournament: Tournament) {
  return (
    (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? Number.POSITIVE_INFINITY) -
      (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? Number.POSITIVE_INFINITY) ||
    (firstTournament.startDate ?? "").localeCompare(secondTournament.startDate ?? "") ||
    firstTournament.title.localeCompare(secondTournament.title)
  );
}

function sortScrimsByDay(firstScrim: Scrim, secondScrim: Scrim) {
  return (
    (firstScrim.seasonDayNumber ?? Number.POSITIVE_INFINITY) - (secondScrim.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
    (firstScrim.date ?? "").localeCompare(secondScrim.date ?? "") ||
    firstScrim.title.localeCompare(secondScrim.title)
  );
}

function getDayLabel(dayNumber?: number) {
  return typeof dayNumber === "number" && Number.isFinite(dayNumber) ? `Day ${dayNumber}` : "Day";
}

export default function PubgImportManager({
  seasons,
  tournaments,
  scrims,
  activeSeasonId,
  initialMatchIds,
  initialTournamentId,
  initialScrimId,
  autoPreviewRequestKey,
  onImported,
}: {
  seasons: Season[];
  tournaments: Tournament[];
  scrims: Scrim[];
  activeSeasonId?: string;
  initialMatchIds?: string;
  initialTournamentId?: string;
  initialScrimId?: string;
  autoPreviewRequestKey?: string;
  onImported?: () => void;
}) {
  const [playerName, setPlayerName] = useState("");
  const [directMatchIds, setDirectMatchIds] = useState("");
  const [lookup, setLookup] = useState<PubgPlayerLookup | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeasonId ?? seasons[0]?.id ?? "");
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | "">("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedScrimId, setSelectedScrimId] = useState("");
  const [dayTitle, setDayTitle] = useState("");
  const [dayDate, setDayDate] = useState("");
  const [dayMap, setDayMap] = useState("");
  const [dayLobbyTime, setDayLobbyTime] = useState("8:00 PM NPT");
  const [dayMapRotation, setDayMapRotation] = useState(defaultMapRotation);
  const [dayMatchCount, setDayMatchCount] = useState(4);
  const [duplicateMode, setDuplicateMode] = useState<PubgDuplicateMode>("overwrite");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [watchers, setWatchers] = useState<PubgImportWatcher[]>([]);
  const [candidates, setCandidates] = useState<PubgImportCandidate[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingWatchers, setLoadingWatchers] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [preparingDay, setPreparingDay] = useState(false);
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [queueingPending, setQueueingPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingWatcher, setSavingWatcher] = useState(false);
  const [autoPublishWatcher, setAutoPublishWatcher] = useState(false);
  const [processingCandidateId, setProcessingCandidateId] = useState<string | null>(null);
  const [maintenanceMatchId, setMaintenanceMatchId] = useState("");
  const [maintenanceRawJson, setMaintenanceRawJson] = useState<string>("");
  const [maintenanceBusyAction, setMaintenanceBusyAction] = useState<"raw" | "repair" | "reset" | "reimport" | null>(null);
  const [maintenanceConfirmPublished, setMaintenanceConfirmPublished] = useState(false);
  const [maintenanceForceRefetch, setMaintenanceForceRefetch] = useState(false);
  const [maintenancePublish, setMaintenancePublish] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewDrafts, setPreviewDrafts] = useState<EditablePreview[]>([]);
  const [previewErrors, setPreviewErrors] = useState<Array<{ matchId: string; error: string; code: string }>>([]);
  const [importLog, setImportLog] = useState<
    Array<{
      matchId: string;
      success: boolean;
      skipped?: boolean;
      error?: string;
    }>
  >([]);
  const [seasonDraft, setSeasonDraft] = useState<SeasonDraft>(() => buildSeasonDraft(1));
  const lastAutoPreviewRequestRef = useRef<string | null>(null);

  const nextSeasonNumber = useMemo(
    () => seasons.reduce((highestSeasonNumber, season) => Math.max(highestSeasonNumber, season.seasonNumber ?? 0), 0) + 1,
    [seasons],
  );

  const selectedSeason = useMemo(() => seasons.find((season) => season.id === selectedSeasonId) ?? null, [seasons, selectedSeasonId]);
  const seasonTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.seasonId === selectedSeasonId).sort(sortTournamentsByDay),
    [selectedSeasonId, tournaments],
  );
  const seasonScrims = useMemo(
    () => scrims.filter((scrim) => scrim.seasonId === selectedSeasonId).sort(sortScrimsByDay),
    [scrims, selectedSeasonId],
  );
  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );
  const selectedScrim = useMemo(() => scrims.find((scrim) => scrim.id === selectedScrimId) ?? null, [scrims, selectedScrimId]);
  const selectedDayTournament = useMemo(() => {
    if (selectedDayNumber === "") return null;
    return (
      seasonTournaments.find((tournament) => (tournament.seasonDayNumber ?? tournament.dayNumber) === Number(selectedDayNumber)) ?? null
    );
  }, [seasonTournaments, selectedDayNumber]);
  const selectedDayScrim = useMemo(() => {
    if (selectedDayNumber === "") return null;
    return (
      seasonScrims.find(
        (scrim) =>
          scrim.seasonDayNumber === Number(selectedDayNumber) ||
          (selectedDayTournament ? scrim.tournamentId === selectedDayTournament.id : false),
      ) ?? null
    );
  }, [seasonScrims, selectedDayNumber, selectedDayTournament]);
  const nextAvailableDayNumber = useMemo(() => {
    const highestSeasonDay = Math.max(
      selectedSeason?.currentDay ?? 0,
      ...seasonTournaments.map((tournament) => tournament.seasonDayNumber ?? tournament.dayNumber ?? 0),
      ...seasonScrims.map((scrim) => scrim.seasonDayNumber ?? 0),
    );

    return Math.max(highestSeasonDay + 1, 1);
  }, [seasonScrims, seasonTournaments, selectedSeason]);
  const selectedDayExists = Boolean(selectedDayTournament || selectedDayScrim);
  const hasEditedMatchIds = useMemo(() => previewDrafts.some((draft) => draft.matchId.trim() !== draft.sourceMatchId), [previewDrafts]);

  const previewMatchIdsEffect = useEffectEvent(previewMatchIds);

  useEffect(() => {
    if (selectedDayNumber !== "" || !selectedSeason) return;
    if (typeof selectedSeason.currentDay === "number" && selectedSeason.currentDay > 0) {
      return scheduleEffectTask(() => setSelectedDayNumber(selectedSeason.currentDay));
    }
  }, [selectedDayNumber, selectedSeason]);

  useEffect(() => {
    if (selectedSeasonId) {
      const selectedSeasonStillExists = seasons.some((season) => season.id === selectedSeasonId);
      if (selectedSeasonStillExists) {
        return;
      }
    }

    const fallbackSeasonId = activeSeasonId ?? seasons[0]?.id ?? "";
    if (fallbackSeasonId && fallbackSeasonId !== selectedSeasonId) {
      return scheduleEffectTask(() => setSelectedSeasonId(fallbackSeasonId));
    }
  }, [activeSeasonId, seasons, selectedSeasonId]);

  useEffect(() => {
    if (seasons.length === 0 && !showSeasonForm && !selectedSeasonId) {
      return scheduleEffectTask(() => {
        setSeasonDraft(buildSeasonDraft(nextSeasonNumber));
        setShowSeasonForm(true);
      });
    }
  }, [nextSeasonNumber, seasons.length, selectedSeasonId, showSeasonForm]);

  useEffect(() => {
    if (initialMatchIds) {
      return scheduleEffectTask(() => setDirectMatchIds(initialMatchIds));
    }
  }, [initialMatchIds]);

  useEffect(() => {
    if (initialTournamentId) {
      const tournament = tournaments.find((item) => item.id === initialTournamentId);
      return scheduleEffectTask(() => {
        setSelectedTournamentId(initialTournamentId);
        if (tournament?.seasonId) {
          setSelectedSeasonId(tournament.seasonId);
        }
        const tournamentDayNumber = tournament?.seasonDayNumber ?? tournament?.dayNumber;
        if (typeof tournamentDayNumber === "number") {
          setSelectedDayNumber(tournamentDayNumber);
        }
      });
    }
  }, [initialTournamentId, tournaments]);

  useEffect(() => {
    if (initialScrimId) {
      const scrim = scrims.find((item) => item.id === initialScrimId);
      return scheduleEffectTask(() => {
        setSelectedScrimId(initialScrimId);
        if (scrim?.seasonId) {
          setSelectedSeasonId(scrim.seasonId);
        }
        if (typeof scrim?.seasonDayNumber === "number") {
          setSelectedDayNumber(scrim.seasonDayNumber);
        }
        if (scrim?.tournamentId) {
          setSelectedTournamentId(scrim.tournamentId);
        }
      });
    }
  }, [initialScrimId, scrims]);

  useEffect(() => {
    if (!autoPreviewRequestKey || autoPreviewRequestKey === lastAutoPreviewRequestRef.current) {
      return;
    }

    const normalizedMatchIds = normalizeMatchIds(initialMatchIds ?? directMatchIds);
    if (normalizedMatchIds.length === 0 || !selectedSeasonId || selectedDayNumber === "") {
      return;
    }

    lastAutoPreviewRequestRef.current = autoPreviewRequestKey;
    void previewMatchIdsEffect(normalizedMatchIds);
  }, [autoPreviewRequestKey, directMatchIds, initialMatchIds, selectedDayNumber, selectedSeasonId]);

  useEffect(() => {
    if (!selectedTournament) return;
    return scheduleEffectTask(() => {
      if (selectedTournament.seasonId && selectedTournament.seasonId !== selectedSeasonId) {
        setSelectedSeasonId(selectedTournament.seasonId);
      }

      const tournamentDayNumber = selectedTournament.seasonDayNumber ?? selectedTournament.dayNumber;
      if (typeof tournamentDayNumber === "number" && tournamentDayNumber !== selectedDayNumber) {
        setSelectedDayNumber(tournamentDayNumber);
      }

      if (!selectedScrimId) {
        const matchingScrim = scrims.find((scrim) => scrim.tournamentId === selectedTournament.id);
        if (matchingScrim) {
          setSelectedScrimId(matchingScrim.id);
        }
      }
    });
  }, [scrims, selectedDayNumber, selectedScrimId, selectedSeasonId, selectedTournament]);

  useEffect(() => {
    if (!selectedScrim) return;
    return scheduleEffectTask(() => {
      if (selectedScrim.seasonId && selectedScrim.seasonId !== selectedSeasonId) {
        setSelectedSeasonId(selectedScrim.seasonId);
      }
      if (typeof selectedScrim.seasonDayNumber === "number" && selectedScrim.seasonDayNumber !== selectedDayNumber) {
        setSelectedDayNumber(selectedScrim.seasonDayNumber);
      }
      if (selectedScrim.tournamentId && selectedScrim.tournamentId !== selectedTournamentId) {
        setSelectedTournamentId(selectedScrim.tournamentId);
      }
    });
  }, [selectedDayNumber, selectedScrim, selectedSeasonId, selectedTournamentId]);

  useEffect(() => {
    return scheduleEffectTask(() => {
      if (selectedScrim) {
        setDayTitle(selectedScrim.title ?? "");
        setDayDate(selectedScrim.date ?? "");
        setDayMap(selectedScrim.map ?? "");
        setDayLobbyTime(selectedScrim.lobbyTime ?? "8:00 PM NPT");
        setDayMapRotation((selectedScrim.mapRotation ?? []).join(", ") || defaultMapRotation);
        setDayMatchCount(Math.max(1, selectedScrim.mapRotation?.length ?? 4));
        return;
      }

      if (selectedTournament) {
        setDayTitle(selectedTournament.title ?? "");
        setDayDate(selectedTournament.startDate ?? "");
        setDayMap((selectedTournament.mapRotation ?? [])[0] ?? "");
        setDayLobbyTime("8:00 PM NPT");
        setDayMapRotation((selectedTournament.mapRotation ?? []).join(", ") || defaultMapRotation);
        setDayMatchCount(Math.max(1, selectedTournament.mapRotation?.length ?? 4));
        return;
      }

      if (selectedSeason && selectedDayNumber !== "") {
        setDayTitle(`${getDayLabel(Number(selectedDayNumber))} - ${selectedSeason.seriesTitle ?? selectedSeason.title}`);
        setDayDate(addDays(selectedSeason.startDate, Math.max(Number(selectedDayNumber) - 1, 0)));
        setDayMap("Rondo");
        setDayLobbyTime("8:00 PM NPT");
        setDayMapRotation(defaultMapRotation);
        setDayMatchCount(4);
      }
    });
  }, [selectedDayNumber, selectedScrim, selectedSeason, selectedTournament]);

  async function loadWatchers() {
    setLoadingWatchers(true);
    try {
      const response = await adminFetch("/api/admin/pubg/watchers");
      setWatchers(response.data ?? []);
    } catch (lookupError: unknown) {
      setError(
        toUserFacingErrorMessage(lookupError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setLoadingWatchers(false);
    }
  }

  async function loadCandidates() {
    setLoadingCandidates(true);
    try {
      const response = await adminFetch("/api/admin/pubg/candidates");
      setCandidates(response.data ?? []);
    } catch (candidateError: unknown) {
      setError(
        toUserFacingErrorMessage(candidateError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  useEffect(() => {
    return scheduleEffectTask(async () => {
      await Promise.all([loadWatchers(), loadCandidates()]);
    });
  }, []);

  function applyResolvedDayContext(context?: { seasonId?: string; seasonDayNumber?: number; tournamentId?: string; scrimId?: string }) {
    if (!context) return;
    if (context.seasonId) {
      setSelectedSeasonId(context.seasonId);
    }
    if (typeof context.seasonDayNumber === "number") {
      setSelectedDayNumber(context.seasonDayNumber);
    }
    if (context.tournamentId) {
      setSelectedTournamentId(context.tournamentId);
    }
    if (context.scrimId) {
      setSelectedScrimId(context.scrimId);
    }
  }

  function getDaySetupPayload() {
    const normalizedRotation = normalizeMapRotation(dayMapRotation);

    return {
      dayTitle: dayTitle.trim() || undefined,
      dayDate: dayDate || undefined,
      dayMap: dayMap.trim() || undefined,
      dayLobbyTime: dayLobbyTime.trim() || undefined,
      dayMapRotation: normalizedRotation.length > 0 ? normalizedRotation : undefined,
      dayMatchCount: Math.max(1, Number(dayMatchCount) || 1),
    };
  }

  function resetSeasonDraft(targetSeasonNumber = nextSeasonNumber) {
    setSeasonDraft(buildSeasonDraft(targetSeasonNumber));
  }

  function toggleSeasonForm() {
    if (!showSeasonForm) {
      resetSeasonDraft(nextSeasonNumber);
    }

    setShowSeasonForm((currentValue) => !currentValue);
  }

  function updatePreviewDraft(sourceMatchId: string, updater: (draft: EditablePreview) => EditablePreview) {
    setPreviewDrafts((currentDrafts) => currentDrafts.map((draft) => (draft.sourceMatchId === sourceMatchId ? updater(draft) : draft)));
  }

  function updateTeamResult(sourceMatchId: string, teamIndex: number, field: keyof TeamMatchResult, rawValue: string) {
    updatePreviewDraft(sourceMatchId, (draft) => {
      const currentTeamResults = [...draft.teamResults];
      const targetTeam = currentTeamResults[teamIndex];
      if (!targetTeam) return draft;

      const previousTeamName = targetTeam.teamName;
      const previousSlotNumber = targetTeam.slotNumber;
      const updatedTeam = { ...targetTeam };

      if (field === "teamName") {
        updatedTeam.teamName = rawValue;
      } else if (field === "slotNumber") {
        updatedTeam.slotNumber = rawValue ? Number(rawValue) : undefined;
      } else {
        const numericValue = rawValue ? Number(rawValue) : 0;
        if (field === "placement") {
          updatedTeam.placement = numericValue;
          updatedTeam.placementPoints = placementPointsForPlacement(numericValue);
        } else if (field === "kills") {
          updatedTeam.kills = numericValue;
          updatedTeam.killPoints = numericValue;
        } else if (field === "placementPoints") {
          updatedTeam.placementPoints = numericValue;
        } else if (field === "killPoints") {
          updatedTeam.killPoints = numericValue;
        } else if (field === "damage") {
          updatedTeam.damage = numericValue;
        } else if (field === "totalPoints") {
          updatedTeam.totalPoints = numericValue;
        }
      }

      currentTeamResults[teamIndex] = normalizePreviewTeamResult(updatedTeam, field === "slotNumber" ? "slotNumber" : "teamName");
      const normalizedUpdatedTeam = currentTeamResults[teamIndex];

      const updatedPlayers = draft.playerResults.map((playerResult) => {
        const belongsToTeam = playerResult.teamName === previousTeamName && (playerResult.slotNumber ?? undefined) === previousSlotNumber;

        if (!belongsToTeam) return playerResult;

        return {
          ...playerResult,
          teamName: normalizedUpdatedTeam.teamName,
          slotNumber: normalizedUpdatedTeam.slotNumber,
          placement: normalizedUpdatedTeam.placement,
          placementPoints: normalizedUpdatedTeam.placementPoints,
          totalPoints: normalizedUpdatedTeam.placementPoints + playerResult.kills,
        };
      });
      const normalizedResults = normalizePreviewResults(currentTeamResults, updatedPlayers);

      return {
        ...draft,
        detectedTeams: normalizedResults.teamResults.length,
        teamResults: normalizedResults.teamResults,
        playerResults: normalizedResults.playerResults,
      };
    });
  }

  function updatePlayerResult(sourceMatchId: string, playerIndex: number, field: keyof MatchPlayerResult, rawValue: string) {
    updatePreviewDraft(sourceMatchId, (draft) => {
      const currentPlayerResults = [...draft.playerResults];
      const targetPlayer = currentPlayerResults[playerIndex];
      if (!targetPlayer) return draft;

      const updatedPlayer = { ...targetPlayer };
      if (field === "playerName") {
        updatedPlayer.playerName = rawValue;
      } else if (field === "teamName") {
        updatedPlayer.teamName = rawValue;
      } else if (field === "pubgPlayerId") {
        updatedPlayer.pubgPlayerId = rawValue || undefined;
      } else if (field === "slotNumber") {
        updatedPlayer.slotNumber = rawValue ? Number(rawValue) : undefined;
      } else {
        const numericValue = rawValue ? Number(rawValue) : 0;
        if (field === "placement") {
          updatedPlayer.placement = numericValue;
          updatedPlayer.placementPoints = placementPointsForPlacement(numericValue);
        } else if (field === "kills") {
          updatedPlayer.kills = numericValue;
        } else if (field === "assists") {
          updatedPlayer.assists = numericValue;
        } else if (field === "knocks") {
          updatedPlayer.knocks = numericValue;
        } else if (field === "damage") {
          updatedPlayer.damage = numericValue;
        } else if (field === "survivalTime") {
          updatedPlayer.survivalTime = numericValue;
        } else if (field === "placementPoints") {
          updatedPlayer.placementPoints = numericValue;
        } else if (field === "totalPoints") {
          updatedPlayer.totalPoints = numericValue;
        }
      }

      currentPlayerResults[playerIndex] = normalizePreviewPlayerResult(
        updatedPlayer,
        draft.teamResults,
        field === "slotNumber" ? "slotNumber" : "teamName",
      );
      const normalizedResults = normalizePreviewResults(draft.teamResults, currentPlayerResults);

      return {
        ...draft,
        detectedPlayers: normalizedResults.playerResults.length,
        teamResults: normalizedResults.teamResults,
        playerResults: normalizedResults.playerResults,
      };
    });
  }

  function buildMatchEditPayload(): PubgImportEdit[] {
    return previewDrafts.map((draft) => {
      const normalizedResults = normalizePreviewResults(draft.teamResults, draft.playerResults);

      return {
        sourceMatchId: draft.sourceMatchId,
        matchId: draft.matchId.trim(),
        matchNumber: draft.matchNumber,
        map: draft.map.trim() || undefined,
        playedAt: buildPlayedAtValue(draft.matchDate, draft.matchTime),
        teamResults: normalizedResults.teamResults,
        playerResults: normalizedResults.playerResults,
      };
    });
  }

  function buildPendingPreviewPayload(): PubgImportBatchPreviewMatch[] {
    return previewDrafts.map((draft) => {
      const normalizedResults = normalizePreviewResults(draft.teamResults, draft.playerResults);

      return {
        sourceMatchId: draft.sourceMatchId,
        matchId: draft.matchId.trim(),
        matchNumber: draft.matchNumber,
        map: draft.map.trim() || undefined,
        matchDate: draft.matchDate || undefined,
        matchTime: draft.matchTime || undefined,
        alreadyImported: draft.alreadyImported,
        source: draft.source,
        summary: draft.summary,
        tournamentTitle: draft.tournamentTitle,
        scrimTitle: draft.scrimTitle,
        teamResults: normalizedResults.teamResults,
        playerResults: normalizedResults.playerResults,
        conflicts: draft.conflicts,
        warnings: draft.warnings,
      };
    });
  }

  async function handlePrepareDay() {
    if (!selectedSeasonId) {
      setError(
        seasons.length === 0 ? "Create a season first, then prepare the scrim day." : "Select a season before preparing a scrim day.",
      );
      return;
    }

    if (selectedDayNumber === "" || selectedDayNumber < 1) {
      setError("Enter a valid scrim day number first.");
      return;
    }

    setPreparingDay(true);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/seasons/create-next-day", {
        method: "POST",
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          targetDayNumber: Number(selectedDayNumber),
          ...getDaySetupPayload(),
        }),
      });

      applyResolvedDayContext({
        seasonId: selectedSeasonId,
        seasonDayNumber: Number(selectedDayNumber),
        tournamentId: response.data?.tournament?.id,
        scrimId: response.data?.scrim?.id,
      });
      setMessage(response.message ?? `${getDayLabel(Number(selectedDayNumber))} is ready for imports.`);
      onImported?.();
    } catch (prepareError: unknown) {
      setError(
        toUserFacingErrorMessage(prepareError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setPreparingDay(false);
    }
  }

  async function createSeasonFromDraft(draft: SeasonDraft, options?: { prepareDayOne?: boolean }) {
    setCreatingSeason(true);
    setError(null);
    setMessage(null);

    try {
      const normalizedSeriesTitle = draft.seriesTitle.trim() || defaultSeasonSeriesTitle;
      const normalizedSeasonNumber = Math.max(1, Number(draft.seasonNumber) || nextSeasonNumber);
      const normalizedTitle = draft.title.trim() || `${normalizedSeriesTitle} Season ${normalizedSeasonNumber}`;
      const normalizedConfiguredDays = Math.max(1, Number(draft.configuredDays) || 15);

      const response = await adminFetch("/api/seasons", {
        method: "POST",
        body: JSON.stringify({
          title: normalizedTitle,
          slug: slugify(normalizedTitle),
          seriesTitle: normalizedSeriesTitle,
          seasonNumber: normalizedSeasonNumber,
          status: draft.status,
          startDate: draft.startDate || getTodayInKathmandu(),
          configuredDays: normalizedConfiguredDays,
          currentDay: 0,
          game: draft.game.trim() || "PUBG PC",
          format: draft.format.trim() || "Squad",
          region: draft.region.trim() || "Global",
          perspective: draft.perspective.trim() || "TPP",
        }),
      });

      const createdSeason = response.data as Season;
      setSelectedSeasonId(createdSeason.id);
      setSelectedTournamentId("");
      setSelectedScrimId("");
      setSelectedDayNumber(1);
      setDayTitle(`Day 1 - ${createdSeason.seriesTitle ?? createdSeason.title}`);
      setDayDate(createdSeason.startDate);
      setDayMap("Rondo");
      setDayLobbyTime("8:00 PM NPT");
      setDayMapRotation(defaultMapRotation);
      setDayMatchCount(4);

      if (options?.prepareDayOne) {
        const preparedDayResponse = await adminFetch("/api/admin/seasons/create-next-day", {
          method: "POST",
          body: JSON.stringify({
            seasonId: createdSeason.id,
            targetDayNumber: 1,
            dayTitle: `Day 1 - ${createdSeason.seriesTitle ?? createdSeason.title}`,
            dayDate: createdSeason.startDate,
            dayMap: "Rondo",
            dayLobbyTime: "8:00 PM NPT",
            dayMapRotation: normalizeMapRotation(defaultMapRotation),
            dayMatchCount: 4,
          }),
        });

        applyResolvedDayContext({
          seasonId: createdSeason.id,
          seasonDayNumber: 1,
          tournamentId: preparedDayResponse.data?.tournament?.id,
          scrimId: preparedDayResponse.data?.scrim?.id,
        });
        setMessage(preparedDayResponse.message ?? `Created ${createdSeason.title} and prepared Day 1 for imports.`);
      } else {
        setMessage(response.message ?? "Created the season. You can prepare Day 1 now.");
      }

      setShowSeasonForm(false);
      resetSeasonDraft(Math.max(normalizedSeasonNumber + 1, nextSeasonNumber + 1));
      onImported?.();
    } catch (seasonError: unknown) {
      setError(
        toUserFacingErrorMessage(seasonError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setCreatingSeason(false);
    }
  }

  async function handleCreateDefaultSeason() {
    await createSeasonFromDraft(buildSeasonDraft(nextSeasonNumber));
  }

  async function handleCreateSeason(prepareDayOne = false) {
    await createSeasonFromDraft(seasonDraft, { prepareDayOne });
  }

  async function handleLookup() {
    if (!playerName.trim()) {
      setError("PUBG player name is required.");
      return;
    }

    setLoadingLookup(true);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pubg/player", {
        method: "POST",
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const data = response.data as PubgPlayerLookup;
      setLookup(data);
      setSelectedMatchIds(data.recentMatches.map((match) => match.matchId));
      setMessage(`Fetched ${data.recentMatches.length} recent PUBG matches for ${data.playerName}.`);
    } catch (lookupError: unknown) {
      setLookup(null);
      setSelectedMatchIds([]);
      setError(
        toUserFacingErrorMessage(lookupError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setLoadingLookup(false);
    }
  }

  async function previewMatchIds(matchIds: string[]) {
    const normalizedMatchIds = normalizeMatchIds(matchIds.join("\n"));
    if (normalizedMatchIds.length === 0) {
      setError("Select at least one PUBG match ID to preview.");
      return;
    }

    if (!selectedSeasonId || selectedDayNumber === "") {
      setError("Select or prepare a scrim day before previewing PUBG matches.");
      return;
    }

    setPreviewing(true);
    setError(null);
    setMessage(null);
    setPreviewErrors([]);

    try {
      const response = await adminFetch("/api/admin/pubg/match", {
        method: "POST",
        body: JSON.stringify({
          matchIds: normalizedMatchIds,
          seasonId: selectedSeasonId,
          seasonDayNumber: Number(selectedDayNumber),
          tournamentId: selectedTournamentId || undefined,
          scrimId: selectedScrimId || undefined,
          autoCreateDay: true,
          ...getDaySetupPayload(),
        }),
      });

      const data = response.data as PubgBulkPreviewResult;
      setPreviewDrafts((data.previews ?? []).map(createEditablePreview));
      setPreviewErrors(data.errors ?? []);
      applyResolvedDayContext(data.context);
      setMessage(
        data.previews.length > 0
          ? `Prepared preview for ${data.previews.length} PUBG match${data.previews.length === 1 ? "" : "es"}.`
          : "No preview could be generated for the provided PUBG match IDs.",
      );
    } catch (previewError: unknown) {
      setPreviewDrafts([]);
      setPreviewErrors([]);
      setError(
        toUserFacingErrorMessage(previewError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function importPreviewedMatches() {
    const hasEditedMatchId = previewDrafts.some((draft) => draft.matchId.trim() !== draft.sourceMatchId);
    if (hasEditedMatchId) {
      setError("One or more match IDs were changed. Re-preview the edited match IDs before importing.");
      return;
    }

    const matchIds = previewDrafts.map((preview) => preview.sourceMatchId);
    if (matchIds.length === 0) {
      setError("Preview at least one PUBG match before importing.");
      return;
    }

    if (!selectedSeasonId || selectedDayNumber === "") {
      setError("Select or prepare a scrim day before importing PUBG matches.");
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/matches/import", {
        method: "POST",
        body: JSON.stringify({
          matchIds,
          seasonId: selectedSeasonId,
          seasonDayNumber: Number(selectedDayNumber),
          tournamentId: selectedTournamentId || undefined,
          scrimId: selectedScrimId || undefined,
          autoCreateDay: true,
          screenshotUrl: screenshotUrl || undefined,
          duplicateMode,
          matchEdits: buildMatchEditPayload(),
          ...getDaySetupPayload(),
        }),
      });

      const data = response.data as PubgBulkImportResult;
      applyResolvedDayContext(data.context);
      setImportLog(
        (data.results ?? []).map((result) => ({
          matchId: result.matchId,
          success: result.success,
          skipped: result.skipped,
          error: result.error,
        })),
      );

      if (data.failedCount > 0) {
        setError(
          `Imported ${data.importedCount} match${data.importedCount === 1 ? "" : "es"} with ${data.failedCount} failure${data.failedCount === 1 ? "" : "s"}.`,
        );
      } else {
        setMessage(
          `Imported ${data.importedCount} PUBG match${data.importedCount === 1 ? "" : "es"} for ${getDayLabel(
            data.context.seasonDayNumber,
          )}.`,
        );
      }

      if (lookup) {
        const importedIds = new Set(
          (data.results ?? []).filter((result) => result.success && !result.skipped).map((result) => result.matchId),
        );
        setLookup({
          ...lookup,
          recentMatches: lookup.recentMatches.map((match) =>
            importedIds.has(match.matchId) ? { ...match, alreadyImported: true } : match,
          ),
        });
      }

      setSelectedMatchIds([]);
      setDirectMatchIds("");
      setPreviewDrafts([]);
      setPreviewErrors([]);
      onImported?.();
    } catch (importError: unknown) {
      setError(
        toUserFacingErrorMessage(importError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setImporting(false);
    }
  }

  async function savePreviewedMatchesToPending() {
    if (!selectedSeasonId || selectedDayNumber === "") {
      setError("Select or prepare a scrim day before saving pending imports.");
      return;
    }

    if (previewDrafts.length === 0) {
      setError("Preview at least one PUBG match before saving to pending imports.");
      return;
    }

    if (hasEditedMatchIds) {
      setError("Re-preview edited match IDs before saving them to pending imports.");
      return;
    }

    setQueueingPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pending-imports", {
        method: "POST",
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          seasonTitle: selectedSeason?.seriesTitle ?? selectedSeason?.title,
          seasonDayNumber: Number(selectedDayNumber),
          tournamentId: selectedTournamentId || undefined,
          tournamentTitle: selectedTournament?.title,
          scrimId: selectedScrimId || undefined,
          scrimTitle: selectedScrim?.title,
          matchIds: previewDrafts.map((draft) => draft.matchId.trim()),
          duplicateMode,
          screenshotUrl: screenshotUrl || undefined,
          matchEdits: buildMatchEditPayload(),
          previews: buildPendingPreviewPayload(),
          ...getDaySetupPayload(),
        }),
      });

      setMessage(response.message ?? "Saved the preview to pending imports.");
      setPreviewDrafts([]);
      setPreviewErrors([]);
      onImported?.();
    } catch (queueError: unknown) {
      setError(
        toUserFacingErrorMessage(queueError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setQueueingPending(false);
    }
  }

  async function handleSaveWatcher() {
    if (!lookup) {
      setError("Fetch a PUBG player first before enabling auto-import.");
      return;
    }

    setSavingWatcher(true);
    setError(null);

    try {
      await adminFetch("/api/admin/pubg/watchers", {
        method: "POST",
        body: JSON.stringify({
          playerName: lookup.playerName,
          playerId: lookup.playerId,
          shardId: lookup.shardId,
          tournamentId: selectedTournamentId || undefined,
          scrimId: selectedScrimId || undefined,
          enabled: true,
          autoImportNewMatches: true,
          autoPublishCandidates: autoPublishWatcher,
          importedMatchIds: lookup.recentMatches.filter((match) => match.alreadyImported).map((match) => match.matchId),
          processedMatchIds: lookup.recentMatches.filter((match) => match.alreadyImported).map((match) => match.matchId),
        }),
      });
      setMessage(
        autoPublishWatcher
          ? `Auto-detect and auto-publish are enabled for ${lookup.playerName}.`
          : `Auto-detect is enabled for ${lookup.playerName}.`,
      );
      await loadWatchers();
      await loadCandidates();
    } catch (watcherError: unknown) {
      setError(
        toUserFacingErrorMessage(watcherError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setSavingWatcher(false);
    }
  }

  async function toggleWatcher(watcher: PubgImportWatcher, enabled: boolean) {
    try {
      await adminFetch("/api/admin/pubg/watchers", {
        method: "PATCH",
        body: JSON.stringify({ id: watcher.id, enabled }),
      });
      await loadWatchers();
    } catch (watcherError: unknown) {
      setError(
        toUserFacingErrorMessage(watcherError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    }
  }

  async function deleteWatcher(watcherId: string) {
    try {
      await adminFetch(`/api/admin/pubg/watchers?id=${encodeURIComponent(watcherId)}`, {
        method: "DELETE",
      });
      await loadWatchers();
    } catch (watcherError: unknown) {
      setError(
        toUserFacingErrorMessage(watcherError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    }
  }

  function previewCandidate(candidate: PubgImportCandidate) {
    const preview = {
      ...candidate.preview,
      matchNumber: candidate.targetMatchNumber ?? candidate.preview.matchNumber,
    };
    applyResolvedDayContext({
      seasonId: candidate.seasonId,
      seasonDayNumber: candidate.seasonDayNumber,
      tournamentId: candidate.tournamentId,
      scrimId: candidate.scrimId,
    });
    setDirectMatchIds(candidate.matchId);
    setSelectedMatchIds([candidate.matchId]);
    setPreviewDrafts([createEditablePreview(preview)]);
    setPreviewErrors([]);
    setMessage(`Loaded auto-detect preview for ${candidate.matchId}.`);
    setError(null);
  }

  async function handleCandidateAction(candidateId: string, action: "approve_publish" | "reject" | "force_import_draft") {
    setProcessingCandidateId(candidateId);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pubg/candidates", {
        method: "PATCH",
        body: JSON.stringify({ id: candidateId, action }),
      });
      setMessage(
        action === "approve_publish"
          ? "Candidate published successfully."
          : action === "force_import_draft"
            ? "Candidate imported to draft."
            : "Candidate rejected.",
      );
      await loadCandidates();
      await loadWatchers();
      onImported?.();
      return response.data as PubgImportCandidate;
    } catch (candidateError: unknown) {
      setError(
        toUserFacingErrorMessage(candidateError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
      return null;
    } finally {
      setProcessingCandidateId(null);
    }
  }

  async function handleFetchRawPayload() {
    if (!maintenanceMatchId.trim()) {
      setError("Enter a PUBG match ID first.");
      return;
    }

    setMaintenanceBusyAction("raw");
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch(`/api/admin/pubg/raw?matchId=${encodeURIComponent(maintenanceMatchId.trim())}`);
      setMaintenanceRawJson(JSON.stringify(response.data?.raw ?? null, null, 2));
      setMessage("Loaded cached raw JSON payload.");
    } catch (maintenanceError: unknown) {
      setMaintenanceRawJson("");
      setError(
        toUserFacingErrorMessage(maintenanceError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setMaintenanceBusyAction(null);
    }
  }

  async function handleRepairMatch() {
    if (!maintenanceMatchId.trim()) {
      setError("Enter a PUBG match ID first.");
      return;
    }

    setMaintenanceBusyAction("repair");
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pubg/import/repair", {
        method: "POST",
        body: JSON.stringify({
          matchId: maintenanceMatchId.trim(),
          publish: maintenancePublish,
          forcePublished: maintenanceConfirmPublished,
        }),
      });
      setMessage(response.message ?? "Match repaired successfully.");
      onImported?.();
    } catch (maintenanceError: unknown) {
      setError(
        toUserFacingErrorMessage(maintenanceError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setMaintenanceBusyAction(null);
    }
  }

  async function handleResetMatch() {
    if (!maintenanceMatchId.trim()) {
      setError("Enter a PUBG match ID first.");
      return;
    }

    setMaintenanceBusyAction("reset");
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pubg/import/reset", {
        method: "POST",
        body: JSON.stringify({
          matchId: maintenanceMatchId.trim(),
          confirmPublished: maintenanceConfirmPublished,
        }),
      });
      setMessage(response.message ?? "Imported match reset successfully.");
      onImported?.();
    } catch (maintenanceError: unknown) {
      setError(
        toUserFacingErrorMessage(maintenanceError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setMaintenanceBusyAction(null);
    }
  }

  async function handleReimportMatch() {
    if (!maintenanceMatchId.trim()) {
      setError("Enter a PUBG match ID first.");
      return;
    }

    if (!selectedSeasonId || selectedDayNumber === "") {
      setError("Select or prepare a scrim day before reimporting.");
      return;
    }

    setMaintenanceBusyAction("reimport");
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch("/api/admin/pubg/import/reimport", {
        method: "POST",
        body: JSON.stringify({
          matchId: maintenanceMatchId.trim(),
          seasonId: selectedSeasonId,
          seasonDayNumber: Number(selectedDayNumber),
          tournamentId: selectedTournamentId || undefined,
          scrimId: selectedScrimId || undefined,
          duplicateMode,
          autoCreateDay: true,
          publish: maintenancePublish,
          forceRefetch: maintenanceForceRefetch,
          ...getDaySetupPayload(),
        }),
      });
      setMessage(
        response.data?.failedCount > 0
          ? `Reimported with ${response.data.failedCount} failure${response.data.failedCount === 1 ? "" : "s"}.`
          : "Match reimport completed successfully.",
      );
      onImported?.();
    } catch (maintenanceError: unknown) {
      setError(
        toUserFacingErrorMessage(maintenanceError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setMaintenanceBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">PUBG Match Import</h2>
        <p className="mt-2 text-sm text-text-muted">
          Create the day, fetch PUBG matches, verify the preview, save to pending, then approve and publish.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-card border px-4 py-3 text-sm ${
            error ? "border-accent-red/30 bg-accent-red/10 text-white" : "border-accent-green/25 bg-accent-green/10 text-white"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="esports-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-heading !text-sm">Season Setup</p>
            <p className="mt-1 text-sm text-text-muted">
              Create a season here if needed, then create the scrim day before previewing or importing PUBG matches.
            </p>
            {selectedSeason && (
              <p className="mt-2 text-xs text-text-muted">
                Selected season: {selectedSeason.seriesTitle ?? selectedSeason.title} | Current day: {selectedSeason.currentDay || 0} | Next
                available day: {nextAvailableDayNumber}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={toggleSeasonForm} className={btnSecondary}>
              {showSeasonForm ? "Hide Season Form" : "Create New Season"}
            </button>
            <button type="button" onClick={() => void handleCreateDefaultSeason()} disabled={creatingSeason} className={btnPrimary}>
              {creatingSeason ? "Creating Season..." : "Quick Create Default Season"}
            </button>
          </div>
        </div>

        {showSeasonForm && (
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 xl:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Season title"
              value={seasonDraft.title}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  title: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              placeholder="Series title"
              value={seasonDraft.seriesTitle}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  seriesTitle: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              type="number"
              min={1}
              placeholder="Season number"
              value={seasonDraft.seasonNumber}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  seasonNumber: event.target.value ? Number(event.target.value) : nextSeasonNumber,
                }))
              }
            />
            <select
              className={inputClass}
              value={seasonDraft.status}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  status: event.target.value as Season["status"],
                }))
              }
            >
              <option value="active">active</option>
              <option value="planned">planned</option>
            </select>
            <input
              className={inputClass}
              type="date"
              value={seasonDraft.startDate}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  startDate: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              type="number"
              min={1}
              placeholder="Configured days"
              value={seasonDraft.configuredDays}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  configuredDays: event.target.value ? Number(event.target.value) : 15,
                }))
              }
            />
            <input
              className={inputClass}
              placeholder="Game"
              value={seasonDraft.game}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  game: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              placeholder="Format"
              value={seasonDraft.format}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  format: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              placeholder="Region"
              value={seasonDraft.region}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  region: event.target.value,
                }))
              }
            />
            <input
              className={inputClass}
              placeholder="Perspective"
              value={seasonDraft.perspective}
              onChange={(event) =>
                setSeasonDraft((currentDraft) => ({
                  ...currentDraft,
                  perspective: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap gap-3 xl:col-span-2">
              <button type="button" onClick={() => void handleCreateSeason(false)} disabled={creatingSeason} className={btnPrimary}>
                {creatingSeason ? "Creating Season..." : "Create Season"}
              </button>
              <button type="button" onClick={() => void handleCreateSeason(true)} disabled={creatingSeason} className={btnSecondary}>
                {creatingSeason ? "Preparing..." : "Create Season + Day 1"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="esports-card grid gap-4 p-6 xl:grid-cols-2">
        <select
          className={inputClass}
          value={selectedSeasonId}
          disabled={seasons.length === 0}
          onChange={(event) => {
            setSelectedSeasonId(event.target.value);
            setSelectedTournamentId("");
            setSelectedScrimId("");
          }}
        >
          <option value="">Select season</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.seriesTitle ?? season.title}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={`${inputClass} flex-1`}
            type="number"
            min={1}
            placeholder="Scrim day number"
            value={selectedDayNumber}
            onChange={(event) => setSelectedDayNumber(event.target.value ? Number(event.target.value) : "")}
          />
          <button
            type="button"
            onClick={() => setSelectedDayNumber(nextAvailableDayNumber)}
            disabled={!selectedSeason}
            className={btnSecondary}
          >
            Use Next Day
          </button>
          <button type="button" onClick={() => void handlePrepareDay()} disabled={preparingDay} className={btnPrimary}>
            {preparingDay
              ? "Preparing..."
              : selectedDayNumber === ""
                ? "Create Day"
                : selectedDayExists
                  ? `Update Day ${selectedDayNumber}`
                  : `Create Day ${selectedDayNumber}`}
          </button>
        </div>

        <div className="xl:col-span-2">
          <p className="text-xs text-text-muted">
            {selectedSeason
              ? selectedDayNumber === ""
                ? `Choose a day number or use Next Day (${nextAvailableDayNumber}).`
                : selectedDayExists
                  ? `${getDayLabel(Number(selectedDayNumber))} already exists. Saving here will update its title, date, map, and linked import target.`
                  : `${getDayLabel(Number(selectedDayNumber))} does not exist yet. Saving here will create the tournament day and scrim automatically.`
              : "Create or select a season first, then create the scrim day here."}
          </p>
        </div>

        <select className={inputClass} value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
          <option value="">Linked tournament day</option>
          {seasonTournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {getDayLabel(tournament.seasonDayNumber ?? tournament.dayNumber)} - {tournament.title}
            </option>
          ))}
        </select>

        <select className={inputClass} value={selectedScrimId} onChange={(event) => setSelectedScrimId(event.target.value)}>
          <option value="">Linked scrim day</option>
          {seasonScrims.map((scrim) => (
            <option key={scrim.id} value={scrim.id}>
              {getDayLabel(scrim.seasonDayNumber)} - {scrim.title}
            </option>
          ))}
        </select>

        <input className={inputClass} placeholder="Day title" value={dayTitle} onChange={(event) => setDayTitle(event.target.value)} />

        <input className={inputClass} type="date" value={dayDate} onChange={(event) => setDayDate(event.target.value)} />

        <input
          className={inputClass}
          list="pubg-map-options"
          placeholder="Scrim map"
          value={dayMap}
          onChange={(event) => setDayMap(event.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Lobby time"
          value={dayLobbyTime}
          onChange={(event) => setDayLobbyTime(event.target.value)}
        />

        <input
          className={inputClass}
          type="number"
          min={1}
          placeholder="Match count"
          value={dayMatchCount}
          onChange={(event) => setDayMatchCount(Math.max(1, Number(event.target.value) || 1))}
        />

        <input
          className={inputClass}
          placeholder="Map rotation (comma separated)"
          value={dayMapRotation}
          onChange={(event) => setDayMapRotation(event.target.value)}
        />

        <input
          className={inputClass}
          placeholder="PUBG player / in-game name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />

        <button type="button" onClick={() => void handleLookup()} disabled={loadingLookup} className={btnPrimary}>
          {loadingLookup ? "Fetching..." : "Fetch Recent Matches"}
        </button>

        <FileUpload
          type="match_screenshot"
          entityId={previewDrafts[0]?.matchId || normalizeMatchIds(directMatchIds)[0] || "match"}
          label="Result Screenshot"
          currentUrl={screenshotUrl}
          onUploaded={setScreenshotUrl}
        />

        <div className="flex flex-wrap gap-3 sm:items-end">
          <label className="inline-flex items-center gap-2 text-xs text-text-muted">
            <input type="checkbox" checked={autoPublishWatcher} onChange={(event) => setAutoPublishWatcher(event.target.checked)} />
            auto-publish 80+ confidence matches
          </label>
          <button type="button" onClick={() => void handleSaveWatcher()} disabled={savingWatcher || !lookup} className={btnPrimary}>
            {savingWatcher ? "Saving..." : "Enable Auto-Import"}
          </button>
          <p className="text-xs text-text-muted">
            Auto-detect uses the currently selected day context when new matches are found for this player.
          </p>
        </div>
      </div>

      <datalist id="pubg-map-options">
        {pubgMaps.map((mapName) => (
          <option key={mapName} value={mapName} />
        ))}
      </datalist>

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <div className="esports-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Recent Match History</p>
                <p className="mt-1 text-sm text-text-muted">
                  Fetch PUBG recent matches by player name, select the IDs you want, preview them, then import them into the selected day.
                </p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm">
                <p className="font-semibold text-white">
                  {selectedSeason ? `${selectedSeason.seriesTitle ?? selectedSeason.title}` : "No season selected"}
                </p>
                <p className="text-xs uppercase text-text-muted">
                  {selectedDayNumber === "" ? "Day not selected" : getDayLabel(Number(selectedDayNumber))}
                </p>
              </div>
            </div>

            {!lookup ? (
              <div className="mt-5 rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
                Fetch a PUBG player name to load recent match IDs from the official PUBG PC API.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {lookup.recentMatches.map((match) => (
                  <label
                    key={match.matchId}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-bg-primary p-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMatchIds.includes(match.matchId)}
                        onChange={(event) => {
                          setSelectedMatchIds((currentIds) =>
                            event.target.checked
                              ? [...currentIds, match.matchId]
                              : currentIds.filter((currentId) => currentId !== match.matchId),
                          );
                        }}
                      />
                      <div>
                        <p className="font-mono-stat text-sm text-white">{match.matchId}</p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          {match.mapName} | {match.gameMode}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">{formatDisplayDateTime(match.createdAt)}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        match.alreadyImported ? "bg-accent-yellow/15 text-accent-yellow" : "bg-accent-blue/10 text-accent-blue"
                      }`}
                    >
                      {match.alreadyImported ? "Already Imported" : "Ready"}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void previewMatchIds(selectedMatchIds)}
                disabled={previewing || selectedMatchIds.length === 0}
                className={btnPrimary}
              >
                {previewing ? "Previewing..." : "Preview Selected Matches"}
              </button>
              {lookup && (
                <button
                  type="button"
                  onClick={() => setSelectedMatchIds(lookup.recentMatches.map((match) => match.matchId))}
                  className="btn-secondary"
                >
                  Select All Fetched Matches
                </button>
              )}
            </div>
          </div>

          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Bulk Match ID Import</p>
            <p className="mt-1 text-sm text-text-muted">
              Paste one match ID per line or comma-separated. Preview first, then import the whole batch into the prepared day.
            </p>
            <textarea
              className={`${inputClass} mt-5 min-h-32`}
              placeholder="match.one&#10;match.two&#10;match.three"
              value={directMatchIds}
              onChange={(event) => setDirectMatchIds(event.target.value)}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void previewMatchIds(normalizeMatchIds(directMatchIds))}
                disabled={previewing}
                className={btnPrimary}
              >
                {previewing ? "Previewing..." : "Preview Bulk Match IDs"}
              </button>
              <button type="button" onClick={() => setDirectMatchIds("")} className="btn-secondary">
                Clear Match IDs
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="esports-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Auto-Detect Candidates</p>
                <p className="mt-1 text-sm text-text-muted">
                  Watcher-discovered PUBG matches are scored here before they can touch public data.
                </p>
              </div>
              {loadingCandidates && <span className="text-xs text-text-muted">Refreshing...</span>}
            </div>

            {candidates.length === 0 ? (
              <div className="mt-5 rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
                No auto-detect candidates yet.
              </div>
            ) : (
              <div className="mt-5 table-scroll">
                <table className="data-table min-w-[1200px]">
                  <thead>
                    <tr>
                      <th>Match ID</th>
                      <th>Detected From</th>
                      <th>Map</th>
                      <th>Time</th>
                      <th>Known Teams</th>
                      <th>Known Players</th>
                      <th>Unknown Teams</th>
                      <th>Unknown Players</th>
                      <th>Confidence</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="font-mono text-xs text-white">{candidate.matchId}</td>
                        <td>
                          <div className="text-sm text-white">{candidate.detectedFromPlayer}</div>
                          <div className="text-[11px] text-text-muted">
                            {candidate.tournamentTitle ?? candidate.scrimTitle ?? "Event pending"}
                          </div>
                        </td>
                        <td>{candidate.map ?? candidate.preview.summary.mapName ?? "Unknown"}</td>
                        <td className="text-xs text-text-muted">
                          {candidate.matchTime ? formatDisplayDateTime(candidate.matchTime) : "Time pending"}
                        </td>
                        <td>
                          {candidate.knownTeams}/{candidate.actualTeamCount}
                        </td>
                        <td>
                          {candidate.knownPlayers}/{candidate.actualParticipantCount}
                        </td>
                        <td>{candidate.unknownTeams}</td>
                        <td>{candidate.unknownPlayers}</td>
                        <td className="font-mono-stat text-white">{candidate.confidenceScore}</td>
                        <td className="max-w-[280px] text-xs text-text-muted">{candidate.confidenceReason}</td>
                        <td>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {candidate.status.replaceAll("_", " ")}
                          </div>
                          {candidate.publishedAt ? (
                            <div className="mt-1 text-[11px] text-accent-green">Published</div>
                          ) : candidate.importedDraftAt ? (
                            <div className="mt-1 text-[11px] text-accent-blue">Draft created</div>
                          ) : candidate.rejectedAt ? (
                            <div className="mt-1 text-[11px] text-accent-red">Rejected</div>
                          ) : candidate.reviewPending ? (
                            <div className="mt-1 text-[11px] text-accent-yellow">Review pending</div>
                          ) : null}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => previewCandidate(candidate)}
                              className="btn-secondary !px-3 !py-2 !text-[11px]"
                            >
                              Preview
                            </button>
                            {candidate.reviewPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleCandidateAction(candidate.id, "approve_publish")}
                                  disabled={processingCandidateId === candidate.id}
                                  className="btn-primary !px-3 !py-2 !text-[11px]"
                                >
                                  {processingCandidateId === candidate.id ? "Working..." : "Approve & Publish"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleCandidateAction(candidate.id, "force_import_draft")}
                                  disabled={processingCandidateId === candidate.id}
                                  className="btn-secondary !px-3 !py-2 !text-[11px]"
                                >
                                  Force Import Draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleCandidateAction(candidate.id, "reject")}
                                  disabled={processingCandidateId === candidate.id}
                                  className="btn-watch-live !px-3 !py-2 !text-[11px]"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="esports-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Auto-Import Watchers</p>
                <p className="mt-1 text-sm text-text-muted">Saved player names checked by the cron sync job.</p>
              </div>
              {loadingWatchers && <span className="text-xs text-text-muted">Refreshing...</span>}
            </div>

            {watchers.length === 0 ? (
              <div className="mt-5 rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
                No auto-import watchers saved yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {watchers.map((watcher) => (
                  <div key={watcher.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{watcher.playerName}</p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          {watcher.scrimId
                            ? `Scrim ${watcher.scrimId}`
                            : watcher.tournamentId
                              ? `Tournament ${watcher.tournamentId}`
                              : "General watcher"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                          watcher.enabled === false ? "bg-accent-red/15 text-accent-red" : "bg-accent-green/15 text-accent-green"
                        }`}
                      >
                        {watcher.enabled === false ? "Paused" : "Active"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-text-muted">
                      <p>Processed IDs tracked: {watcher.processedMatchIds?.length ?? watcher.importedMatchIds?.length ?? 0}</p>
                      <p>Imported IDs tracked: {watcher.importedMatchIds?.length ?? 0}</p>
                      <p>Last checked: {watcher.lastCheckedAt ? formatDisplayDateTime(watcher.lastCheckedAt) : "Never"}</p>
                      <p>Last detected: {watcher.lastDetectedAt ? formatDisplayDateTime(watcher.lastDetectedAt) : "Not yet"}</p>
                      <p>Last imported: {watcher.lastImportedAt ? formatDisplayDateTime(watcher.lastImportedAt) : "Not yet"}</p>
                      <p>Auto-publish: {watcher.autoPublishCandidates ? "On" : "Off"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleWatcher(watcher, watcher.enabled === false)}
                        className="btn-secondary !px-4 !py-2 !text-[11px]"
                      >
                        {watcher.enabled === false ? "Resume" : "Pause"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteWatcher(watcher.id)}
                        className="btn-watch-live !px-4 !py-2 !text-[11px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="esports-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Import Repair / Reset</p>
                <p className="mt-1 text-sm text-text-muted">
                  Manual results remain the fallback. Use these tools to repair cached imports, fetch raw JSON, reset bad imports, or
                  reimport safely.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <input
                className={inputClass}
                placeholder="PUBG match ID"
                value={maintenanceMatchId}
                onChange={(event) => setMaintenanceMatchId(event.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={maintenanceConfirmPublished}
                    onChange={(event) => setMaintenanceConfirmPublished(event.target.checked)}
                  />
                  allow published reset/repair
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-text-muted">
                  <input type="checkbox" checked={maintenancePublish} onChange={(event) => setMaintenancePublish(event.target.checked)} />
                  publish after repair/reimport
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={maintenanceForceRefetch}
                    onChange={(event) => setMaintenanceForceRefetch(event.target.checked)}
                  />
                  force refetch raw from PUBG API
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleFetchRawPayload()}
                  disabled={maintenanceBusyAction !== null}
                  className="btn-secondary !px-4 !py-2 !text-[11px]"
                >
                  {maintenanceBusyAction === "raw" ? "Loading..." : "Get Raw JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRepairMatch()}
                  disabled={maintenanceBusyAction !== null}
                  className="btn-secondary !px-4 !py-2 !text-[11px]"
                >
                  {maintenanceBusyAction === "repair" ? "Repairing..." : "Repair From Raw"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleReimportMatch()}
                  disabled={maintenanceBusyAction !== null}
                  className="btn-primary !px-4 !py-2 !text-[11px]"
                >
                  {maintenanceBusyAction === "reimport" ? "Reimporting..." : "Reimport Match"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetMatch()}
                  disabled={maintenanceBusyAction !== null}
                  className="btn-watch-live !px-4 !py-2 !text-[11px]"
                >
                  {maintenanceBusyAction === "reset" ? "Resetting..." : "Reset Imported Match"}
                </button>
              </div>

              {maintenanceRawJson ? (
                <textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={maintenanceRawJson} readOnly />
              ) : null}
            </div>
          </div>

          {(previewErrors.length > 0 || importLog.length > 0) && (
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Import Errors</p>
              <div className="mt-4 space-y-2 text-sm">
                {previewErrors.map((entry) => (
                  <div
                    key={`preview-${entry.matchId}`}
                    className="rounded-card border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-white"
                  >
                    <span className="font-mono-stat">{entry.matchId}</span>
                    <span className="ml-2 text-xs uppercase">{entry.code.replaceAll("_", " ")}</span>
                    <p className="mt-1 text-xs text-white/80">{entry.error}</p>
                  </div>
                ))}
                {importLog
                  .filter((entry) => !entry.success || entry.skipped)
                  .map((entry) => (
                    <div
                      key={`import-${entry.matchId}`}
                      className={`rounded-card border px-3 py-2 ${
                        entry.skipped
                          ? "border-accent-yellow/30 bg-accent-yellow/10 text-white"
                          : "border-accent-red/30 bg-accent-red/10 text-white"
                      }`}
                    >
                      <span className="font-mono-stat">{entry.matchId}</span>
                      <span className="ml-2 text-xs uppercase">{entry.skipped ? "Skipped duplicate" : (entry.error ?? "Failed")}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {previewDrafts.length > 0 && (
            <div className="esports-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-heading !text-sm">Import Preview</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Step 1: verify every fetched match. Step 2: save the reviewed draft to pending imports. Step 3: publish the draft when
                    ready. Match metadata, teams, players, placements, kills, and points can be corrected here.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className={inputClass}
                    value={duplicateMode}
                    onChange={(event) => setDuplicateMode(event.target.value as PubgDuplicateMode)}
                  >
                    <option value="overwrite">Update Existing Matches</option>
                    <option value="skip">Skip Duplicates</option>
                    <option value="error">Stop On Duplicates</option>
                  </select>
                  {hasEditedMatchIds && (
                    <button
                      type="button"
                      onClick={() => void previewMatchIds(previewDrafts.map((draft) => draft.matchId))}
                      disabled={previewing}
                      className="btn-secondary"
                    >
                      {previewing ? "Refreshing..." : "Re-Preview Edited IDs"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void savePreviewedMatchesToPending()}
                    disabled={queueingPending || hasEditedMatchIds}
                    className="btn-secondary"
                  >
                    {queueingPending ? "Saving..." : "Save Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void importPreviewedMatches()}
                    disabled={importing || hasEditedMatchIds}
                    className={btnPrimary}
                  >
                    {importing ? "Importing..." : "Import Draft"}
                  </button>
                  <button type="button" onClick={() => setPreviewDrafts([])} className="btn-watch-live">
                    Delete Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMatchId = previewDrafts[0]?.matchId;
                      if (firstMatchId) {
                        setMaintenanceMatchId(firstMatchId);
                      }
                    }}
                    className="btn-secondary"
                  >
                    Repair
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMatchId = previewDrafts[0]?.matchId;
                      if (firstMatchId) {
                        setMaintenanceMatchId(firstMatchId);
                      }
                    }}
                    className="btn-secondary"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDrafts([]);
                      setPreviewErrors([]);
                    }}
                    className="btn-secondary"
                  >
                    Cancel Import
                  </button>
                </div>
              </div>

              {hasEditedMatchIds && (
                <div className="mt-4 rounded-card border border-accent-yellow/30 bg-accent-yellow/10 px-4 py-3 text-sm text-white">
                  Match IDs were edited. Refresh the preview before saving or importing so PUBG data is fetched again for those IDs.
                </div>
              )}

              <div className="mt-5 space-y-4">
                {previewDrafts.map((preview, previewIndex) => (
                  <div key={preview.sourceMatchId} className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">
                          Match Review {previewIndex + 1}
                        </p>
                        <p className="mt-2 font-mono-stat text-sm text-white">{preview.sourceMatchId}</p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          Source: {preview.source === "db_cache" ? "DB cache" : "PUBG API"} | {preview.summary.mapName ?? "Unknown map"} |{" "}
                          {preview.summary.gameMode ?? "Unknown mode"}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {preview.summary.createdAt ? formatDisplayDateTime(preview.summary.createdAt) : "Time unavailable"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {preview.alreadyImported && (
                          <span className="rounded-full bg-accent-yellow/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-yellow">
                            Duplicate detected
                          </span>
                        )}
                        {preview.seasonDayNumber && (
                          <span className="rounded-full bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-blue">
                            Day {preview.seasonDayNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match ID</p>
                        <input
                          className={`${inputClass} mt-2`}
                          value={preview.matchId}
                          onChange={(event) =>
                            updatePreviewDraft(preview.sourceMatchId, (draft) => ({
                              ...draft,
                              matchId: event.target.value,
                            }))
                          }
                        />
                        {preview.matchId.trim() !== preview.sourceMatchId && (
                          <p className="mt-2 text-xs text-accent-yellow">Re-preview required after changing match ID.</p>
                        )}
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match Number</p>
                        <input
                          className={`${inputClass} mt-2`}
                          type="number"
                          min={1}
                          value={preview.matchNumber}
                          onChange={(event) =>
                            updatePreviewDraft(preview.sourceMatchId, (draft) => ({
                              ...draft,
                              matchNumber: event.target.value ? Number(event.target.value) : draft.matchNumber,
                            }))
                          }
                        />
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Scrim Day</p>
                        <input
                          className={`${inputClass} mt-2`}
                          type="number"
                          min={1}
                          value={selectedDayNumber}
                          onChange={(event) => setSelectedDayNumber(event.target.value ? Number(event.target.value) : "")}
                        />
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Map</p>
                        <input
                          className={`${inputClass} mt-2`}
                          list="pubg-map-options"
                          value={preview.map}
                          onChange={(event) =>
                            updatePreviewDraft(preview.sourceMatchId, (draft) => ({
                              ...draft,
                              map: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match Date</p>
                        <input
                          className={`${inputClass} mt-2`}
                          type="date"
                          value={preview.matchDate}
                          onChange={(event) =>
                            updatePreviewDraft(preview.sourceMatchId, (draft) => ({
                              ...draft,
                              matchDate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match Time</p>
                        <input
                          className={`${inputClass} mt-2`}
                          type="time"
                          value={preview.matchTime}
                          onChange={(event) =>
                            updatePreviewDraft(preview.sourceMatchId, (draft) => ({
                              ...draft,
                              matchTime: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
                        <p className="mt-1 font-mono-stat text-white">{preview.teamResults.length}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Players</p>
                        <p className="mt-1 font-mono-stat text-white">{preview.playerResults.length}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Source</p>
                        <p className="mt-1 text-sm text-white">{preview.source === "db_cache" ? "DB cache" : "PUBG API"}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Tournament</p>
                        <p className="mt-1 text-sm text-white">{preview.tournamentTitle ?? "Not linked"}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Scrim</p>
                        <p className="mt-1 text-sm text-white">{preview.scrimTitle ?? "Not linked"}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Unmapped Teams</p>
                        <p className="mt-1 font-mono-stat text-white">
                          {preview.warnings.filter((warning) => warning.type === "unknown_team").length}
                        </p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Unmapped Players</p>
                        <p className="mt-1 font-mono-stat text-white">
                          {preview.warnings.filter((warning) => warning.type === "unknown_player").length}
                        </p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Warnings</p>
                        <p className="mt-1 font-mono-stat text-white">{preview.warnings.length}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Points Preview</p>
                        <p className="mt-1 font-mono-stat text-white">
                          {preview.teamResults.reduce(
                            (sum, teamResult) => sum + (Number.isFinite(teamResult.totalPoints) ? teamResult.totalPoints : 0),
                            0,
                          )}
                        </p>
                      </div>
                    </div>

                    {preview.conflicts.length > 0 && (
                      <div className="mt-4 rounded-card border border-accent-yellow/25 bg-accent-yellow/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-yellow">Player Team Mismatch Detected</p>
                        <div className="mt-3 space-y-2 text-sm text-white">
                          {preview.conflicts.map((conflict) => (
                            <p key={`${preview.matchId}-${conflict.playerName}`}>
                              {conflict.playerName}: {conflict.currentTeamName ?? "No current team"} {"->"} {conflict.importedTeamName}
                            </p>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-text-muted">
                          Historical match stats stay on the imported team. Current team is recalculated after import.
                        </p>
                      </div>
                    )}

                    {preview.warnings.length > 0 && (
                      <div className="mt-4 rounded-card border border-accent-blue/25 bg-accent-blue/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-blue">Import Warnings</p>
                        <div className="mt-3 space-y-2 text-sm text-white">
                          {preview.warnings.slice(0, 12).map((warning, warningIndex) => (
                            <p key={`${preview.matchId}-${warning.type}-${warningIndex}`}>
                              [{warning.type.replaceAll("_", " ")}] {warning.message}
                            </p>
                          ))}
                        </div>
                        {preview.warnings.length > 12 ? (
                          <p className="mt-3 text-xs text-text-muted">
                            Showing the first 12 warnings. Refresh with a narrower preview if you need to inspect fewer rows at once.
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Team Verification</p>
                        <p className="text-xs text-text-muted">Edit team names, slots, placements, kills, and points before publishing.</p>
                      </div>
                      <div className="mt-3 table-scroll">
                        <table className="data-table min-w-full">
                          <thead>
                            <tr>
                              <th>Match</th>
                              <th>Place</th>
                              <th>Slot</th>
                              <th>Team</th>
                              <th>Kills</th>
                              <th>Place Pts</th>
                              <th>Kill Pts</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.teamResults.map((teamResult, teamIndex) => (
                              <tr key={`${preview.sourceMatchId}-${teamIndex}`}>
                                <td>#{preview.matchNumber}</td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={1}
                                    value={teamResult.placement}
                                    onChange={(event) =>
                                      updateTeamResult(preview.sourceMatchId, teamIndex, "placement", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={1}
                                    value={teamResult.slotNumber ?? ""}
                                    onChange={(event) =>
                                      updateTeamResult(preview.sourceMatchId, teamIndex, "slotNumber", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="min-w-[180px] rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    value={teamResult.teamName}
                                    onChange={(event) => updateTeamResult(preview.sourceMatchId, teamIndex, "teamName", event.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={teamResult.kills}
                                    onChange={(event) => updateTeamResult(preview.sourceMatchId, teamIndex, "kills", event.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={teamResult.placementPoints}
                                    onChange={(event) =>
                                      updateTeamResult(preview.sourceMatchId, teamIndex, "placementPoints", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={teamResult.killPoints}
                                    onChange={(event) =>
                                      updateTeamResult(preview.sourceMatchId, teamIndex, "killPoints", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={teamResult.totalPoints}
                                    onChange={(event) =>
                                      updateTeamResult(preview.sourceMatchId, teamIndex, "totalPoints", event.target.value)
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Player Verification</p>
                        <p className="text-xs text-text-muted">
                          Review player mapping, kills, assists, damage, survival time, and points before approval.
                        </p>
                      </div>
                      <div className="mt-3 table-scroll">
                        <table className="data-table min-w-[1200px]">
                          <thead>
                            <tr>
                              <th>Player</th>
                              <th>PUBG ID</th>
                              <th>Team</th>
                              <th>Slot</th>
                              <th>Place</th>
                              <th>Kills</th>
                              <th>Assists</th>
                              <th>Knocks</th>
                              <th>Damage</th>
                              <th>Survival</th>
                              <th>Place Pts</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.playerResults.map((playerResult, playerIndex) => (
                              <tr key={`${preview.sourceMatchId}-${playerIndex}-${playerResult.playerName}`}>
                                <td>
                                  <input
                                    className="min-w-[160px] rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    value={playerResult.playerName}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "playerName", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="min-w-[160px] rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    value={playerResult.pubgPlayerId ?? ""}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "pubgPlayerId", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="min-w-[160px] rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    value={playerResult.teamName}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "teamName", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={1}
                                    value={playerResult.slotNumber ?? ""}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "slotNumber", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={1}
                                    value={playerResult.placement}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "placement", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.kills}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "kills", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.assists}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "assists", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-20 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.knocks}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "knocks", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.damage}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "damage", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.survivalTime}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "survivalTime", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.placementPoints}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "placementPoints", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    className="w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-white"
                                    type="number"
                                    min={0}
                                    value={playerResult.totalPoints}
                                    onChange={(event) =>
                                      updatePlayerResult(preview.sourceMatchId, playerIndex, "totalPoints", event.target.value)
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importLog.length > 0 && (
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Latest Import Log</p>
              <div className="mt-4 space-y-2 text-sm">
                {importLog.map((entry) => (
                  <div
                    key={`${entry.matchId}-${entry.success ? "ok" : "error"}`}
                    className={`rounded-card border px-3 py-2 ${
                      entry.success
                        ? "border-accent-green/30 bg-accent-green/10 text-white"
                        : "border-accent-red/30 bg-accent-red/10 text-white"
                    }`}
                  >
                    <span className="font-mono-stat">{entry.matchId}</span>
                    <span className="ml-2 text-xs uppercase">
                      {entry.success ? (entry.skipped ? "Skipped" : "Imported") : (entry.error ?? "Failed")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
