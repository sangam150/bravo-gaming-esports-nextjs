"use client";

import { useEffect, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { adminFetch } from "@/lib/admin-api";
import type { PubgImportPreview, PubgImportWatcher, PubgPlayerLookup, Scrim, Tournament } from "@/lib/types";

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";

function normalizeMatchIds(value?: string) {
  return Array.from(new Set((value ?? "").split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)));
}

export default function PubgImportManager({
  tournaments,
  scrims,
  initialMatchIds,
  initialTournamentId,
  initialScrimId,
  onImported,
}: {
  tournaments: Tournament[];
  scrims: Scrim[];
  initialMatchIds?: string;
  initialTournamentId?: string;
  initialScrimId?: string;
  onImported?: () => void;
}) {
  const [playerName, setPlayerName] = useState("");
  const [directMatchIds, setDirectMatchIds] = useState("");
  const [lookup, setLookup] = useState<PubgPlayerLookup | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedScrimId, setSelectedScrimId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [watchers, setWatchers] = useState<PubgImportWatcher[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingWatchers, setLoadingWatchers] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingWatcher, setSavingWatcher] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PubgImportPreview[]>([]);
  const [importLog, setImportLog] = useState<Array<{ matchId: string; success: boolean; error?: string }>>([]);

  const selectedScrim = useMemo(
    () => scrims.find((scrim) => scrim.id === selectedScrimId) ?? null,
    [scrims, selectedScrimId]
  );

  useEffect(() => {
    if (!selectedScrim?.tournamentId) return;
    setSelectedTournamentId((currentTournamentId) => currentTournamentId || selectedScrim.tournamentId || "");
  }, [selectedScrim]);

  useEffect(() => {
    if (initialTournamentId) {
      setSelectedTournamentId(initialTournamentId);
    }
  }, [initialTournamentId]);

  useEffect(() => {
    if (initialScrimId) {
      setSelectedScrimId(initialScrimId);
    }
  }, [initialScrimId]);

  useEffect(() => {
    if (initialMatchIds) {
      setDirectMatchIds(initialMatchIds);
    }
  }, [initialMatchIds]);

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

  async function handleLookup() {
    if (!playerName.trim()) {
      setError("PUBG player name is required");
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
      setSelectedMatchIds(
        data.recentMatches.filter((match) => !match.alreadyImported).map((match) => match.matchId)
      );
      setMessage(`Fetched ${data.recentMatches.length} recent PUBG matches for ${data.playerName}.`);
    } catch (lookupError: unknown) {
      setLookup(null);
      setSelectedMatchIds([]);
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
    } finally {
      setLoadingLookup(false);
    }
  }

  async function importMatchIds(matchIds: string[]) {
    const normalizedMatchIds = Array.from(new Set(matchIds.filter(Boolean)));
    if (normalizedMatchIds.length === 0) {
      setError("Select at least one match ID to import.");
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const results: Array<{ matchId: string; success: boolean; error?: string }> = [];

      for (const matchId of normalizedMatchIds) {
        try {
          await adminFetch("/api/admin/matches/import", {
            method: "POST",
            body: JSON.stringify({
              matchId,
              tournamentId: selectedTournamentId || undefined,
              scrimId: selectedScrimId || undefined,
              screenshotUrl: screenshotUrl || undefined,
            }),
          });
          results.push({ matchId, success: true });
        } catch (importError: unknown) {
          results.push({
            matchId,
            success: false,
            error: importError instanceof Error ? importError.message : String(importError),
          });
        }
      }

      setImportLog(results);

      const successfulImports = results.filter((result) => result.success).length;
      const failedImports = results.length - successfulImports;

      if (failedImports > 0) {
        setError(`Imported ${successfulImports}/${results.length} matches. Review the import log below.`);
      } else {
        setMessage(
          results.length === 1
            ? "PUBG match imported successfully."
            : `${successfulImports} PUBG matches imported successfully.`
        );
      }

      if (lookup) {
        setLookup({
          ...lookup,
          recentMatches: lookup.recentMatches.map((match) =>
            normalizedMatchIds.includes(match.matchId) ? { ...match, alreadyImported: true } : match
          ),
        });
      }

      setSelectedMatchIds([]);
      setDirectMatchIds("");
      setPreviews((currentPreviews) =>
        currentPreviews.filter((preview) => !normalizedMatchIds.includes(preview.matchId))
      );
      onImported?.();
    } finally {
      setImporting(false);
    }
  }

  async function previewMatchIds(matchIds: string[]) {
    const normalizedMatchIds = Array.from(new Set(matchIds.filter(Boolean)));
    if (normalizedMatchIds.length === 0) {
      setError("Select at least one match ID to preview.");
      return;
    }

    setPreviewing(true);
    setError(null);
    setMessage(null);

    try {
      const nextPreviews: PubgImportPreview[] = [];
      for (const matchId of normalizedMatchIds) {
        const response = await adminFetch("/api/admin/pubg/match", {
          method: "POST",
          body: JSON.stringify({
            matchId,
            tournamentId: selectedTournamentId || undefined,
            scrimId: selectedScrimId || undefined,
          }),
        });
        nextPreviews.push(response.data as PubgImportPreview);
      }

      setPreviews(nextPreviews);
      setMessage(
        nextPreviews.length === 1
          ? "Import preview loaded for 1 PUBG match."
          : `Import preview loaded for ${nextPreviews.length} PUBG matches.`
      );
    } catch (previewError: unknown) {
      setPreviews([]);
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      setPreviewing(false);
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
          Fetch recent PUBG PC matches by player name, choose the real match IDs to import, or save the player as an
          auto-import watcher for future matches.
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

      <div className="esports-card grid gap-4 p-6 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="PUBG player / in-game name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />
        <button type="button" onClick={handleLookup} disabled={loadingLookup} className={btnPrimary}>
          {loadingLookup ? "Fetching..." : "Fetch Recent Matches"}
        </button>

        <select
          className={inputClass}
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
        >
          <option value="">Assign tournament day (optional)</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {typeof (tournament.seasonDayNumber ?? tournament.dayNumber) === "number"
                ? `Day ${tournament.seasonDayNumber ?? tournament.dayNumber} - ${tournament.title}`
                : tournament.title}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={selectedScrimId}
          onChange={(event) => setSelectedScrimId(event.target.value)}
        >
          <option value="">Assign scrim slot (optional)</option>
          {scrims.map((scrim) => (
            <option key={scrim.id} value={scrim.id}>
              {typeof scrim.seasonDayNumber === "number"
                ? `Day ${scrim.seasonDayNumber} - ${scrim.title}`
                : scrim.title}
            </option>
          ))}
        </select>

        <FileUpload
          type="match_screenshot"
          entityId={selectedMatchIds[0] || normalizeMatchIds(directMatchIds)[0] || "match"}
          label="Result Screenshot"
          currentUrl={screenshotUrl}
          onUploaded={setScreenshotUrl}
        />

        <div className="flex flex-wrap gap-3 sm:items-end">
          <button type="button" onClick={handleSaveWatcher} disabled={savingWatcher || !lookup} className={btnPrimary}>
            {savingWatcher ? "Saving..." : "Enable Auto-Import"}
          </button>
          <p className="text-xs text-text-muted">
            Cron will fetch new recent matches for this player and import the ones not already stored.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <div className="esports-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Recent Match History</p>
                <p className="mt-1 text-sm text-text-muted">
                  Select the PUBG match IDs, assign the correct day, preview the parsed results, then import.
                </p>
              </div>
              {lookup && (
                <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm">
                  <p className="font-semibold text-white">{lookup.playerName}</p>
                  <p className="text-xs uppercase text-text-muted">{lookup.shardId}</p>
                </div>
              )}
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
                        disabled={match.alreadyImported}
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
                          ? "bg-accent-green/15 text-accent-green"
                          : "bg-accent-blue/10 text-accent-blue"
                      }`}
                    >
                      {match.alreadyImported ? "Imported" : "Ready"}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void previewMatchIds(selectedMatchIds)}
                disabled={importing || selectedMatchIds.length === 0}
                className={btnPrimary}
              >
                {previewing ? "Previewing..." : "Preview Selected Matches"}
              </button>
              <button
                type="button"
                onClick={() => void importMatchIds(previews.map((preview) => preview.matchId))}
                disabled={importing || previews.length === 0}
                className="btn-secondary"
              >
                {importing ? "Importing..." : "Import Previewed Matches"}
              </button>
              {lookup && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMatchIds(
                      lookup.recentMatches.filter((match) => !match.alreadyImported).map((match) => match.matchId)
                    )
                  }
                  className="btn-secondary"
                >
                  Select All New Matches
                </button>
              )}
            </div>
          </div>

          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Direct Match ID Import</p>
            <p className="mt-1 text-sm text-text-muted">
              Paste one or more PUBG match IDs manually if you already know which match should be imported.
            </p>
            <textarea
              className={`${inputClass} mt-5 min-h-32`}
              placeholder="One PUBG match ID per line"
              value={directMatchIds}
              onChange={(event) => setDirectMatchIds(event.target.value)}
            />
            <div className="mt-5">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void previewMatchIds(normalizeMatchIds(directMatchIds))}
                  disabled={previewing}
                  className={btnPrimary}
                >
                  {previewing ? "Previewing..." : "Preview Direct Match IDs"}
                </button>
                <button
                  type="button"
                  onClick={() => void importMatchIds(previews.map((preview) => preview.matchId))}
                  disabled={importing || previews.length === 0}
                  className="btn-secondary"
                >
                  {importing ? "Importing..." : "Import Previewed Matches"}
                </button>
              </div>
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
                          {watcher.scrimId ? `Scrim ${watcher.scrimId}` : watcher.tournamentId ? `Tournament ${watcher.tournamentId}` : "General watcher"}
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

          {importLog.length > 0 && (
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Import Log</p>
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
                      {entry.success ? "Imported" : entry.error ?? "Failed"}
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
                    Review parsed teams, players, and mismatch warnings before saving anything.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void importMatchIds(previews.map((preview) => preview.matchId))}
                  disabled={importing}
                  className={btnPrimary}
                >
                  {importing ? "Importing..." : "Confirm Import"}
                </button>
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
                            Re-import will update existing records
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
                              {conflict.playerName}: {conflict.currentTeamName ?? "No current team"} {"->"}{" "}
                              {conflict.importedTeamName}
                            </p>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-text-muted">
                          Historical match stats will stay on the imported team. Current team is recalculated from match
                          history after import.
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
        </div>
      </div>
    </div>
  );
}
