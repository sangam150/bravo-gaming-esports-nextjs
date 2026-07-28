"use client";

import { adminFetch, adminUploadTeamLogo } from "@/lib/admin-api";
import { matchTeamLogoFile, type TeamLogoMatchTeam } from "@/lib/team-logo-matching";
import type { Team } from "@/lib/types";
import { formatUploadSize, getUploadMaxBytes, IMAGE_FILE_INPUT_ACCEPT } from "@/lib/upload-config";
import { validateImageUpload } from "@/lib/upload-validation";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type UploadStatus = "error" | "ignored" | "queued" | "unmatched" | "uploaded" | "uploading";

type TeamWithAliases = Team & {
  aliases?: Array<string | { alias: string }>;
  slug?: string;
};

type UploadResult = {
  alternatives: string[];
  confidence: number;
  file: File;
  fileName: string;
  id: string;
  manualSelection: boolean;
  message: string;
  normalizedFileName: string;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  suggestedTeamName?: string;
  teamId?: string;
  teamName?: string;
  validationPassed: boolean;
};

function aliasesForTeam(team: TeamWithAliases) {
  return (team.aliases ?? [])
    .map((alias) => (typeof alias === "string" ? alias : alias.alias))
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function toMatchTeam(team: TeamWithAliases): TeamLogoMatchTeam {
  return {
    aliases: aliasesForTeam(team),
    id: team.id,
    name: team.name,
    slug: team.slug,
    tag: team.tag,
  };
}

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const next = async (): Promise<void> => {
    const currentIndex = cursor;
    cursor += 1;
    if (currentIndex >= items.length) return;
    await worker(items[currentIndex]);
    await next();
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

export default function BulkTeamLogoUpload({ teams, onComplete }: { teams: TeamWithAliases[]; onComplete: () => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [aliasSavingId, setAliasSavingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const matchTeams = useMemo(() => teams.map(toMatchTeam), [teams]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team] as const)), [teams]);
  const teamsWithLogos = useMemo(() => teams.filter((team) => team.logoUrl || team.logo).length, [teams]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrlsRef.current = [];
    };
  }, []);

  function releasePreviewUrls() {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    previewUrlsRef.current = [];
  }

  function updateResult(resultId: string, updates: Partial<UploadResult>) {
    setResults((currentResults) => currentResults.map((result) => (result.id === resultId ? { ...result, ...updates } : result)));
  }

  function prepareFiles(files: FileList) {
    if (uploading || files.length === 0) return;
    releasePreviewUrls();
    const nextResults = Array.from(files).map((file): UploadResult => {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      const validationError = validateImageUpload({
        type: "team_logo",
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      const match = matchTeamLogoFile(file.name, matchTeams);
      const suggested = match.autoMatch ?? match.candidates[0] ?? null;
      if (validationError) {
        return {
          alternatives: [],
          confidence: 0,
          file,
          fileName: file.name,
          id,
          manualSelection: false,
          message: validationError,
          normalizedFileName: match.normalizedLabel,
          previewUrl,
          progress: 0,
          status: "error",
          validationPassed: false,
        };
      }
      if (!match.autoMatch) {
        return {
          alternatives: match.alternatives.map((candidate) => candidate.team.name),
          confidence: suggested?.confidence ?? 0,
          file,
          fileName: file.name,
          id,
          manualSelection: false,
          message: "Select the correct official team or ignore this file.",
          normalizedFileName: match.normalizedLabel,
          previewUrl,
          progress: 0,
          status: "unmatched",
          suggestedTeamName: suggested?.team.name,
          validationPassed: true,
        };
      }
      return {
        alternatives: match.alternatives.map((candidate) => candidate.team.name),
        confidence: match.autoMatch.confidence,
        file,
        fileName: file.name,
        id,
        manualSelection: false,
        message: "Ready to upload.",
        normalizedFileName: match.normalizedLabel,
        previewUrl,
        progress: 0,
        status: "queued",
        suggestedTeamName: match.autoMatch.team.name,
        teamId: match.autoMatch.team.id,
        teamName: match.autoMatch.team.name,
        validationPassed: true,
      };
    });
    setResults(nextResults);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectTeam(resultId: string, teamId: string) {
    const currentResult = results.find((result) => result.id === resultId);
    if (!currentResult?.validationPassed) return;
    const team = teamById.get(teamId);
    updateResult(resultId, {
      manualSelection: Boolean(team),
      message: team ? "Manual match confirmed. Ready to upload." : "Select the correct official team or ignore this file.",
      status: team ? "queued" : "unmatched",
      teamId: team?.id,
      teamName: team?.name,
    });
  }

  async function saveAlias(result: UploadResult) {
    if (!result.teamId || !result.normalizedFileName) return;
    setAliasSavingId(result.id);
    try {
      await adminFetch(`/api/admin/teams/${encodeURIComponent(result.teamId)}/aliases`, {
        method: "POST",
        body: JSON.stringify({ alias: result.normalizedFileName }),
      });
      updateResult(result.id, { message: "Alias saved. This file is ready to upload." });
    } catch (error) {
      updateResult(result.id, {
        message: error instanceof Error ? error.message : "The alias could not be saved.",
        status: "error",
      });
    } finally {
      setAliasSavingId(null);
    }
  }

  async function uploadResult(result: UploadResult) {
    if (!result.teamId) return;
    updateResult(result.id, {
      message: "Uploading and updating the official team...",
      progress: 0,
      status: "uploading",
    });
    try {
      const response = await adminUploadTeamLogo(result.file, result.teamId, {
        onProgress: (progress) => {
          updateResult(result.id, {
            message: `Uploading ${progress}%`,
            progress,
            status: "uploading",
          });
        },
      });
      updateResult(result.id, {
        message: response.cleanupPending ? "Logo updated. Previous asset cleanup is pending." : "Logo updated on the official team.",
        progress: 100,
        status: "uploaded",
        teamName: response.team.name,
      });
    } catch (error) {
      updateResult(result.id, {
        message: error instanceof Error ? error.message : "The logo could not be uploaded.",
        progress: 0,
        status: "error",
      });
    }
  }

  async function uploadReady() {
    if (uploading) return;
    const ready = results.filter((result) => result.status === "queued" && result.teamId);
    const seenTeamIds = new Set<string>();
    const uniqueReady = ready.filter((result) => {
      if (!result.teamId || seenTeamIds.has(result.teamId)) {
        updateResult(result.id, {
          message: "Another queued file already targets this team. Keep one file and retry.",
          status: "error",
        });
        return false;
      }
      seenTeamIds.add(result.teamId);
      return true;
    });
    if (uniqueReady.length === 0) return;

    setUploading(true);
    try {
      await runWithConcurrency(uniqueReady, 3, uploadResult);
      await onComplete();
    } finally {
      setUploading(false);
    }
  }

  async function retry(result: UploadResult) {
    if (uploading || !result.teamId) return;
    setUploading(true);
    try {
      await uploadResult(result);
      await onComplete();
    } finally {
      setUploading(false);
    }
  }

  const uploadedCount = results.filter((result) => result.status === "uploaded").length;
  const unmatchedCount = results.filter((result) => result.status === "unmatched").length;
  const errorCount = results.filter((result) => result.status === "error").length;
  const queuedCount = results.filter((result) => result.status === "queued" || result.status === "uploading").length;
  const teamLogoMaxUploadSize = formatUploadSize(getUploadMaxBytes("team_logo"));

  return (
    <div aria-busy={uploading} className="esports-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Bulk Upload Team Logos</h3>
          <p className="mt-2 text-sm text-text-muted">
            Review automatic matches before uploading. Uncertain files require an official team selection.
          </p>
          <p className="mt-2 text-xs text-text-muted">Supported files: JPG, PNG, WEBP up to {teamLogoMaxUploadSize}</p>
        </div>
        <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-text-muted">
          {teamsWithLogos}/{teams.length} teams currently have logos
        </div>
      </div>

      <input
        ref={inputRef}
        aria-label="Choose team logo files"
        type="file"
        accept={IMAGE_FILE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) prepareFiles(event.target.files);
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!uploading && event.dataTransfer.files.length) prepareFiles(event.dataTransfer.files);
        }}
        className={`mt-5 rounded-card border-2 border-dashed p-5 transition ${
          dragActive ? "border-accent-blue bg-accent-blue/10" : "border-white/10 bg-bg-primary hover:border-white/20"
        } ${uploading ? "cursor-wait opacity-90" : "cursor-pointer"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Drag and drop logo files here</p>
            <p className="mt-2 text-xs text-text-muted">Uploads run three at a time after you confirm the matches.</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!uploading) inputRef.current?.click();
            }}
            disabled={uploading}
            className="btn-primary disabled:opacity-60"
          >
            Choose Logo Files
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-card border border-accent-green/20 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
              Uploaded: {uploadedCount}
            </div>
            <div className="rounded-card border border-accent-blue/20 bg-accent-blue/10 px-4 py-3 text-sm text-accent-blue">
              Ready: {queuedCount}
            </div>
            <div className="rounded-card border border-accent-yellow/20 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
              Needs Review: {unmatchedCount}
            </div>
            <div className="rounded-card border border-bravoRed/20 bg-bravoRed/10 px-4 py-3 text-sm text-red-300">Errors: {errorCount}</div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => void uploadReady()} disabled={uploading || queuedCount === 0} className="btn-primary">
              {uploading ? "Uploading..." : `Upload ${queuedCount} Ready Logo${queuedCount === 1 ? "" : "s"}`}
            </button>
          </div>

          <div className="max-h-[34rem] overflow-auto rounded-card border border-white/10">
            <table className="data-table min-w-[980px]">
              <caption className="sr-only">Bulk team logo matching, upload progress, and results</caption>
              <thead>
                <tr>
                  <th scope="col">Preview</th>
                  <th scope="col">File</th>
                  <th scope="col">Normalized</th>
                  <th scope="col">Official Team</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>
                      <Image
                        src={result.previewUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-lg border border-white/10 object-contain"
                      />
                    </td>
                    <td>
                      <p className="font-mono text-xs">{result.fileName}</p>
                      <p className="mt-1 max-w-52 text-[11px] text-text-muted">{result.message}</p>
                    </td>
                    <td className="text-xs">{result.normalizedFileName || "—"}</td>
                    <td>
                      <select
                        aria-label={`Official team for ${result.fileName}`}
                        className="input-esports min-w-52"
                        value={result.teamId ?? ""}
                        disabled={!result.validationPassed || uploading || result.status === "uploaded" || result.status === "ignored"}
                        onChange={(event) => selectTeam(result.id, event.target.value)}
                      >
                        <option value="">Select official team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                            {team.tag ? ` [${team.tag}]` : ""}
                          </option>
                        ))}
                      </select>
                      {!result.teamId && result.suggestedTeamName ? (
                        <p className="mt-1 text-[11px] text-accent-yellow">Suggested: {result.suggestedTeamName}</p>
                      ) : null}
                      {result.alternatives.length ? (
                        <p className="mt-1 max-w-56 text-[11px] text-text-muted">Alternatives: {result.alternatives.join(", ")}</p>
                      ) : null}
                    </td>
                    <td>{result.confidence ? `${Math.round(result.confidence * 100)}%` : "—"}</td>
                    <td className="min-w-28">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          role="progressbar"
                          aria-label={`${result.fileName} upload progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={result.progress}
                          className={`h-full rounded-full ${
                            result.status === "uploaded" ? "bg-accent-green" : result.status === "error" ? "bg-bravoRed" : "bg-accent-blue"
                          }`}
                          style={{ width: `${result.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-xs uppercase">{result.status.replace("_", " ")}</td>
                    <td>
                      <div className="flex min-w-40 flex-wrap gap-2">
                        {result.manualSelection && result.teamId && result.status !== "uploaded" ? (
                          <button
                            type="button"
                            disabled={uploading || aliasSavingId === result.id}
                            onClick={() => void saveAlias(result)}
                            className="text-xs text-accent-blue hover:underline disabled:opacity-50"
                          >
                            {aliasSavingId === result.id ? "Saving..." : "Save Alias"}
                          </button>
                        ) : null}
                        {result.status === "error" && result.teamId ? (
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => void retry(result)}
                            className="text-xs text-accent-green hover:underline disabled:opacity-50"
                          >
                            Retry
                          </button>
                        ) : null}
                        {result.status !== "uploaded" && result.status !== "uploading" ? (
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() =>
                              updateResult(result.id, {
                                message: "Ignored by admin.",
                                status: "ignored",
                                teamId: undefined,
                                teamName: undefined,
                              })
                            }
                            className="text-xs text-text-muted hover:text-white disabled:opacity-50"
                          >
                            Ignore
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
