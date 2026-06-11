"use client";

import { useEffect, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { adminFetch } from "@/lib/admin-api";
import type {
  PubgBulkImportResult,
  PubgBulkPreviewResult,
  PubgDuplicateMode,
  PubgImportPreview,
  PubgImportWatcher,
  PubgPlayerLookup,
  Scrim,
  Season,
  Tournament,
} from "@/lib/types";

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";
const defaultMapRotation = "Rondo, Erangel, Miramar, Taego";
const pubgMaps = ["Rondo", "Erangel", "Miramar", "Taego", "Deston", "Vikendi", "Sanhok", "Karakin", "Paramo"];

function normalizeMatchIds(value?: string) {
  return Array.from(new Set((value ?? "").split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)));
}

function normalizeMapRotation(value?: string) {
  return Array.from(new Set((value ?? "").split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)));
}

function addDays(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  return date.toISOString().slice(0, 10);
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
  onImported,
}: {
  seasons: Season[];
  tournaments: Tournament[];
  scrims: Scrim[];
  activeSeasonId?: string;
  initialMatchIds?: string;
  initialTournamentId?: string;
  initialScrimId?: string;
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
  const [duplicateMode, setDuplicateMode] = useState<PubgDuplicateMode>("overwrite");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [watchers, setWatchers] = useState<PubgImportWatcher[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingWatchers, setLoadingWatchers] = useState(false);
  const [preparingDay, setPreparingDay] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingWatcher, setSavingWatcher] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PubgImportPreview[]>([]);
  const [previewErrors, setPreviewErrors] = useState<Array<{ matchId: string; error: string; code: string }>>([]);
  const [importLog, setImportLog] = useState<Array<{ matchId: string; success: boolean; skipped?: boolean; error?: string }>>([]);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId]
  );
  const seasonTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.seasonId === selectedSeasonId).sort(sortTournamentsByDay),
    [selectedSeasonId, tournaments]
  );
  const seasonScrims = useMemo(
    () => scrims.filter((scrim) => scrim.seasonId === selectedSeasonId).sort(sortScrimsByDay),
    [scrims, selectedSeasonId]
  );
  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments]
  );
  const selectedScrim = useMemo(
    () => scrims.find((scrim) => scrim.id === selectedScrimId) ?? null,
    [scrims, selectedScrimId]
  );

  useEffect(() => {
    if (selectedDayNumber !== "" || !selectedSeason) return;
    if (typeof selectedSeason.currentDay === "number" && selectedSeason.currentDay > 0) {
      setSelectedDayNumber(selectedSeason.currentDay);
    }
  }, [selectedDayNumber, selectedSeason]);

  useEffect(() => {
    if (initialMatchIds) {
      setDirectMatchIds(initialMatchIds);
    }
  }, [initialMatchIds]);

  useEffect(() => {
    if (initialTournamentId) {
      const tournament = tournaments.find((item) => item.id === initialTournamentId);
      setSelectedTournamentId(initialTournamentId);
      if (tournament?.seasonId) {
        setSelectedSeasonId(tournament.seasonId);
      }
      const tournamentDayNumber = tournament?.seasonDayNumber ?? tournament?.dayNumber;
      if (typeof tournamentDayNumber === "number") {
        setSelectedDayNumber(tournamentDayNumber);
      }
    }
  }, [initialTournamentId, tournaments]);

  useEffect(() => {
    if (initialScrimId) {
      const scrim = scrims.find((item) => item.id === initialScrimId);
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
    }
  }, [initialScrimId, scrims]);

  useEffect(() => {
    if (!selectedTournament) return;
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
  }, [scrims, selectedDayNumber, selectedScrimId, selectedSeasonId, selectedTournament]);

  useEffect(() => {
    if (!selectedScrim) return;
    if (selectedScrim.seasonId && selectedScrim.seasonId !== selectedSeasonId) {
      setSelectedSeasonId(selectedScrim.seasonId);
    }
    if (typeof selectedScrim.seasonDayNumber === "number" && selectedScrim.seasonDayNumber !== selectedDayNumber) {
      setSelectedDayNumber(selectedScrim.seasonDayNumber);
    }
    if (selectedScrim.tournamentId && selectedScrim.tournamentId !== selectedTournamentId) {
      setSelectedTournamentId(selectedScrim.tournamentId);
    }
  }, [selectedDayNumber, selectedScrim, selectedSeasonId, selectedTournamentId]);

  useEffect(() => {
    if (selectedScrim) {
      setDayTitle(selectedScrim.title ?? "");
      setDayDate(selectedScrim.date ?? "");
      setDayMap(selectedScrim.map ?? "");
      setDayLobbyTime(selectedScrim.lobbyTime ?? "8:00 PM NPT");
      setDayMapRotation((selectedScrim.mapRotation ?? []).join(", ") || defaultMapRotation);
      return;
    }

    if (selectedTournament) {
      setDayTitle(selectedTournament.title ?? "");
      setDayDate(selectedTournament.startDate ?? "");
      setDayMap((selectedTournament.mapRotation ?? [])[0] ?? "");
      setDayLobbyTime("8:00 PM NPT");
      setDayMapRotation((selectedTournament.mapRotation ?? []).join(", ") || defaultMapRotation);
      return;
    }

    if (selectedSeason && selectedDayNumber !== "") {
      setDayTitle(`${getDayLabel(Number(selectedDayNumber))} - ${selectedSeason.seriesTitle ?? selectedSeason.title}`);
      setDayDate(addDays(selectedSeason.startDate, Math.max(Number(selectedDayNumber) - 1, 0)));
      setDayMap("Rondo");
      setDayLobbyTime("8:00 PM NPT");
      setDayMapRotation(defaultMapRotation);
    }
  }, [selectedDayNumber, selectedScrim, selectedSeason, selectedTournament]);

  async function loadWatchers() {
    setLoadingWatchers(true);
    try {
      const response = await adminFetch("/api/admin/pubg/watchers");
      setWatchers(response.data ?? []);
    } catch (lookupError: unknown) {
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
    } finally {
      setLoadingWatchers(false);
    }
  }

  useEffect(() => {
    void loadWatchers();
  }, []);

  function applyResolvedDayContext(context?: {
    seasonId?: string;
    seasonDayNumber?: number;
    tournamentId?: string;
    scrimId?: string;
  }) {
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
    };
  }

  async function handlePrepareDay() {
    if (!selectedSeasonId) {
      setError("Select a season before preparing a scrim day.");
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
      setError(prepareError instanceof Error ? prepareError.message : String(prepareError));
    } finally {
      setPreparingDay(false);
    }
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
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
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
      setPreviews(data.previews ?? []);
      setPreviewErrors(data.errors ?? []);
      applyResolvedDayContext(data.context);
      setMessage(
        data.previews.length > 0
          ? `Prepared preview for ${data.previews.length} PUBG match${data.previews.length === 1 ? "" : "es"}.`
          : "No preview could be generated for the provided PUBG match IDs."
      );
    } catch (previewError: unknown) {
      setPreviews([]);
      setPreviewErrors([]);
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      setPreviewing(false);
    }
  }

  async function importPreviewedMatches() {
    const matchIds = previews.map((preview) => preview.matchId);
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
        }))
      );

      if (data.failedCount > 0) {
        setError(
          `Imported ${data.importedCount} match${data.importedCount === 1 ? "" : "es"} with ${data.failedCount} failure${data.failedCount === 1 ? "" : "s"}.`
        );
      } else {
        setMessage(
          `Imported ${data.importedCount} PUBG match${data.importedCount === 1 ? "" : "es"} for ${getDayLabel(
            data.context.seasonDayNumber
          )}.`
        );
      }

      if (lookup) {
        const importedIds = new Set(
          (data.results ?? []).filter((result) => result.success && !result.skipped).map((result) => result.matchId)
        );
        setLookup({
          ...lookup,
          recentMatches: lookup.recentMatches.map((match) =>
            importedIds.has(match.matchId) ? { ...match, alreadyImported: true } : match
          ),
        });
      }

      setSelectedMatchIds([]);
      setDirectMatchIds("");
      setPreviews([]);
      setPreviewErrors([]);
      onImported?.();
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : String(importError));
    } finally {
      setImporting(false);
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
          importedMatchIds: lookup.recentMatches
            .filter((match) => match.alreadyImported)
            .map((match) => match.matchId),
        }),
      });
      setMessage(`Auto-import is enabled for ${lookup.playerName}.`);
      await loadWatchers();
    } catch (watcherError: unknown) {
      setError(watcherError instanceof Error ? watcherError.message : String(watcherError));
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
      setError(watcherError instanceof Error ? watcherError.message : String(watcherError));
    }
  }

  async function deleteWatcher(watcherId: string) {
    try {
      await adminFetch(`/api/admin/pubg/watchers?id=${encodeURIComponent(watcherId)}`, {
        method: "DELETE",
      });
      await loadWatchers();
    } catch (watcherError: unknown) {
      setError(watcherError instanceof Error ? watcherError.message : String(watcherError));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">PUBG Match Import</h2>
        <p className="mt-2 text-sm text-text-muted">
          Select or prepare the scrim day first, preview one or many PUBG match IDs, then import them in one batch.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-card border px-4 py-3 text-sm ${
            error
              ? "border-accent-red/30 bg-accent-red/10 text-white"
              : "border-accent-green/25 bg-accent-green/10 text-white"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="esports-card grid gap-4 p-6 xl:grid-cols-2">
        <select
          className={inputClass}
          value={selectedSeasonId}
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

        <div className="flex gap-3">
          <input
            className={inputClass}
            type="number"
            min={1}
            placeholder="Scrim day number"
            value={selectedDayNumber}
            onChange={(event) =>
              setSelectedDayNumber(event.target.value ? Number(event.target.value) : "")
            }
          />
          <button type="button" onClick={() => void handlePrepareDay()} disabled={preparingDay} className={btnPrimary}>
            {preparingDay ? "Preparing..." : "Prepare Day"}
          </button>
        </div>

        <select
          className={inputClass}
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
        >
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

        <input
          className={inputClass}
          placeholder="Day title"
          value={dayTitle}
          onChange={(event) => setDayTitle(event.target.value)}
        />

        <input
          className={inputClass}
          type="date"
          value={dayDate}
          onChange={(event) => setDayDate(event.target.value)}
        />

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
          entityId={previews[0]?.matchId || normalizeMatchIds(directMatchIds)[0] || "match"}
          label="Result Screenshot"
          currentUrl={screenshotUrl}
          onUploaded={setScreenshotUrl}
        />

        <div className="flex flex-wrap gap-3 sm:items-end">
          <button type="button" onClick={() => void handleSaveWatcher()} disabled={savingWatcher || !lookup} className={btnPrimary}>
            {savingWatcher ? "Saving..." : "Enable Auto-Import"}
          </button>
          <p className="text-xs text-text-muted">
            Auto-import uses the currently selected day context when new matches are found for this player.
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
                              : currentIds.filter((currentId) => currentId !== match.matchId)
                          );
                        }}
                      />
                      <div>
                        <p className="font-mono-stat text-sm text-white">{match.matchId}</p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          {match.mapName} | {match.gameMode}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">{new Date(match.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        match.alreadyImported
                          ? "bg-accent-yellow/15 text-accent-yellow"
                          : "bg-accent-blue/10 text-accent-blue"
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
              <button
                type="button"
                onClick={() => setDirectMatchIds("")}
                className="btn-secondary"
              >
                Clear Match IDs
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
                          watcher.enabled === false
                            ? "bg-accent-red/15 text-accent-red"
                            : "bg-accent-green/15 text-accent-green"
                        }`}
                      >
                        {watcher.enabled === false ? "Paused" : "Active"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-text-muted">
                      <p>Imported IDs tracked: {watcher.importedMatchIds?.length ?? 0}</p>
                      <p>Last checked: {watcher.lastCheckedAt ? new Date(watcher.lastCheckedAt).toLocaleString() : "Never"}</p>
                      <p>Last imported: {watcher.lastImportedAt ? new Date(watcher.lastImportedAt).toLocaleString() : "Not yet"}</p>
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

          {(previewErrors.length > 0 || importLog.length > 0) && (
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Import Errors</p>
              <div className="mt-4 space-y-2 text-sm">
                {previewErrors.map((entry) => (
                  <div key={`preview-${entry.matchId}`} className="rounded-card border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-white">
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
                      <span className="ml-2 text-xs uppercase">
                        {entry.skipped ? "Skipped duplicate" : entry.error ?? "Failed"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {previews.length > 0 && (
            <div className="esports-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-heading !text-sm">Import Preview</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Review duplicates and parsed standings before importing the whole batch.
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
                  <button type="button" onClick={() => void importPreviewedMatches()} disabled={importing} className={btnPrimary}>
                    {importing ? "Importing..." : "Confirm Bulk Import"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviews([]);
                      setPreviewErrors([]);
                    }}
                    className="btn-secondary"
                  >
                    Cancel Import
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {previews.map((preview) => (
                  <div key={preview.matchId} className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono-stat text-sm text-white">{preview.matchId}</p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          {preview.summary.mapName ?? "Unknown map"} | {preview.summary.gameMode ?? "Unknown mode"}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {preview.summary.createdAt ? new Date(preview.summary.createdAt).toLocaleString() : "Time unavailable"}
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

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
                        <p className="mt-1 font-mono-stat text-white">{preview.detectedTeams}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Players</p>
                        <p className="mt-1 font-mono-stat text-white">{preview.detectedPlayers}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Tournament</p>
                        <p className="mt-1 text-sm text-white">{preview.tournamentTitle ?? "Not linked"}</p>
                      </div>
                      <div className="rounded-card border border-white/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Scrim</p>
                        <p className="mt-1 text-sm text-white">{preview.scrimTitle ?? "Not linked"}</p>
                      </div>
                    </div>

                    {preview.conflicts.length > 0 && (
                      <div className="mt-4 rounded-card border border-accent-yellow/25 bg-accent-yellow/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-yellow">
                          Player Team Mismatch Detected
                        </p>
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

                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Top Placement Table</p>
                      <div className="mt-3 table-scroll">
                        <table className="data-table min-w-full">
                          <thead>
                            <tr>
                              <th>Place</th>
                              <th>Slot</th>
                              <th>Team</th>
                              <th>Kills</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.teamResults.slice(0, 8).map((teamResult) => (
                              <tr key={`${preview.matchId}-${teamResult.teamName}`}>
                                <td>#{teamResult.placement}</td>
                                <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
                                <td className="font-semibold text-white">{teamResult.teamName}</td>
                                <td>{teamResult.kills}</td>
                                <td className="points-cell">{teamResult.totalPoints}</td>
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
                      {entry.success ? (entry.skipped ? "Skipped" : "Imported") : entry.error ?? "Failed"}
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
