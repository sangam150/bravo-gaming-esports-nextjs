"use client";

import { adminFetch, adminUpload } from "@/lib/admin-api";
import type { Team } from "@/lib/types";
import { formatUploadSize, getUploadMaxBytes, IMAGE_FILE_INPUT_ACCEPT } from "@/lib/upload-config";
import { validateImageUpload } from "@/lib/upload-validation";
import { useEffect, useMemo, useRef, useState } from "react";

type UploadStatus = "queued" | "uploading" | "uploaded" | "unmatched" | "error";

type UploadResult = {
  id: string;
  fileName: string;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  teamId?: string;
  teamName?: string;
  message?: string;
};

type PreparedUpload = {
  file: File;
  team: Team;
  resultId: string;
};

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function matchTeam(fileName: string, teams: Team[]) {
  const normalizedFileName = normalizeValue(fileBaseName(fileName));
  if (!normalizedFileName) return null;

  const exactMatches = teams.filter((team) => {
    const candidates = [team.id, team.name, team.tag].filter((value): value is string => Boolean(value));
    return candidates.some((value) => normalizeValue(value) === normalizedFileName);
  });

  if (exactMatches.length === 1) return exactMatches[0];

  const fuzzyMatches = teams.filter((team) => {
    const candidates = [team.id, team.name, team.tag].filter((value): value is string => Boolean(value));
    return candidates.some((value) => {
      const normalizedCandidate = normalizeValue(value);
      return (
        normalizedCandidate.length > 0 &&
        (normalizedFileName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedFileName))
      );
    });
  });

  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : null;
}

export default function BulkTeamLogoUpload({ teams, onComplete }: { teams: Team[]; onComplete: () => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [activeUploadCount, setActiveUploadCount] = useState(0);
  const [totalUploadCount, setTotalUploadCount] = useState(0);

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

  function trackPreviewUrl(previewUrl: string) {
    previewUrlsRef.current.push(previewUrl);
    return previewUrl;
  }

  function updateResult(resultId: string, updates: Partial<UploadResult>) {
    setResults((currentResults) => currentResults.map((result) => (result.id === resultId ? { ...result, ...updates } : result)));
  }

  async function handleBulkUpload(files: FileList) {
    if (uploading) return;

    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    releasePreviewUrls();

    const preparedUploads: PreparedUpload[] = [];
    const nextResults: UploadResult[] = selectedFiles.map((file) => {
      const resultId = crypto.randomUUID();
      const previewUrl = trackPreviewUrl(URL.createObjectURL(file));
      const validationError = validateImageUpload({
        type: "team_logo",
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });

      if (validationError) {
        return {
          id: resultId,
          fileName: file.name,
          previewUrl,
          progress: 0,
          status: "error",
          message: validationError,
        };
      }

      const matchedTeam = matchTeam(file.name, teams);
      if (!matchedTeam) {
        return {
          id: resultId,
          fileName: file.name,
          previewUrl,
          progress: 0,
          status: "unmatched",
          message: "No unique team match found from filename",
        };
      }

      preparedUploads.push({ file, team: matchedTeam, resultId });

      return {
        id: resultId,
        fileName: file.name,
        previewUrl,
        progress: 0,
        status: "queued",
        teamId: matchedTeam.id,
        teamName: matchedTeam.name,
        message: "Ready to upload",
      };
    });

    setResults(nextResults);
    setActiveUploadCount(0);
    setTotalUploadCount(preparedUploads.length);

    if (preparedUploads.length === 0) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    setUploading(true);

    for (let index = 0; index < preparedUploads.length; index += 1) {
      const preparedUpload = preparedUploads[index];
      setActiveUploadCount(index + 1);
      updateResult(preparedUpload.resultId, {
        status: "uploading",
        message: "Uploading to Cloudflare R2...",
      });

      try {
        const uploadResponse = await adminUpload(preparedUpload.file, "team_logo", preparedUpload.team.id, {
          onProgress: (progress) => {
            updateResult(preparedUpload.resultId, {
              progress,
              status: "uploading",
              message: `Uploading ${progress}%`,
            });
          },
          previousUrl: preparedUpload.team.logoUrl ?? preparedUpload.team.logo,
        });

        await adminFetch(`/api/teams/${preparedUpload.team.id}`, {
          method: "PUT",
          body: JSON.stringify({
            logo: uploadResponse.url,
            logoUrl: uploadResponse.url,
          }),
        });

        updateResult(preparedUpload.resultId, {
          progress: 100,
          status: "uploaded",
          message: "Uploaded successfully",
        });
      } catch (error: unknown) {
        updateResult(preparedUpload.resultId, {
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    setUploading(false);
    setActiveUploadCount(0);
    setTotalUploadCount(0);
    await onComplete();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function openFilePicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  const uploadedCount = results.filter((result) => result.status === "uploaded").length;
  const unmatchedCount = results.filter((result) => result.status === "unmatched").length;
  const errorCount = results.filter((result) => result.status === "error").length;
  const queuedCount = results.filter((result) => result.status === "queued" || result.status === "uploading").length;
  const teamLogoMaxUploadSize = formatUploadSize(getUploadMaxBytes("team_logo"));

  return (
    <div className="esports-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Bulk Upload Team Logos</h3>
          <p className="mt-2 text-sm text-text-muted">
            Drop multiple logo files at once. Filenames should match the team `id`, team name, or tag.
          </p>
          <p className="mt-2 text-xs text-text-muted">Supported files: JPG, PNG, WEBP up to {teamLogoMaxUploadSize}</p>
          <p className="mt-1 text-xs text-text-muted">Example: `dead-eyes.png`, `DeadEyes Guys.png`, or `DE.png`</p>
        </div>
        <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-text-muted">
          {teamsWithLogos}/{teams.length} teams currently have logos
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files) {
            void handleBulkUpload(files);
          }
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) {
            setDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (uploading) return;

          const files = event.dataTransfer.files;
          if (files?.length) {
            void handleBulkUpload(files);
          }
        }}
        className={`mt-5 rounded-card border-2 border-dashed p-5 transition ${
          dragActive ? "border-accent-blue bg-accent-blue/10" : "border-white/10 bg-bg-primary hover:border-white/20"
        } ${uploading ? "cursor-wait opacity-90" : "cursor-pointer"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              {uploading ? "Uploading directly to Cloudflare R2" : "Drag and drop logo files here"}
            </p>
            <p className="text-xs text-text-muted">
              {uploading
                ? `Processing ${activeUploadCount} of ${totalUploadCount} matched uploads`
                : "Click anywhere in this area to browse files instead."}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            disabled={uploading}
            className="btn-primary disabled:opacity-60"
          >
            {uploading ? "Uploading Logos..." : "Choose Logo Files"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-card border border-accent-green/20 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
              Uploaded: {uploadedCount}
            </div>
            <div className="rounded-card border border-accent-blue/20 bg-accent-blue/10 px-4 py-3 text-sm text-accent-blue">
              In Queue: {queuedCount}
            </div>
            <div className="rounded-card border border-accent-yellow/20 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
              Unmatched: {unmatchedCount}
            </div>
            <div className="rounded-card border border-bravoRed/20 bg-bravoRed/10 px-4 py-3 text-sm text-red-300">Errors: {errorCount}</div>
          </div>

          <div className="max-h-96 overflow-auto rounded-card border border-white/10">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>File</th>
                  <th>Matched Team</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>
                      <img
                        src={result.previewUrl}
                        alt={result.fileName}
                        className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                      />
                    </td>
                    <td className="font-mono text-xs">{result.fileName}</td>
                    <td>{result.teamName ?? "-"}</td>
                    <td className="min-w-32">
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all ${
                              result.status === "uploaded"
                                ? "bg-accent-green"
                                : result.status === "error" || result.status === "unmatched"
                                  ? "bg-bravoRed"
                                  : "bg-accent-blue"
                            }`}
                            style={{ width: `${result.progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-text-muted">{result.progress}%</p>
                      </div>
                    </td>
                    <td
                      className={
                        result.status === "uploaded"
                          ? "text-accent-green"
                          : result.status === "unmatched"
                            ? "text-accent-yellow"
                            : result.status === "error"
                              ? "text-red-300"
                              : "text-accent-blue"
                      }
                    >
                      {result.status}
                    </td>
                    <td className="text-xs text-text-muted">{result.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
