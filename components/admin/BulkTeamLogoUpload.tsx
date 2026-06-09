"use client";

import { useMemo, useRef, useState } from "react";
import { adminFetch, adminUpload } from "@/lib/admin-api";
import type { Team } from "@/lib/types";

type UploadResult = {
  fileName: string;
  status: "uploaded" | "unmatched" | "error";
  teamName?: string;
  message?: string;
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

export default function BulkTeamLogoUpload({
  teams,
  onComplete,
}: {
  teams: Team[];
  onComplete: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const teamsWithLogos = useMemo(() => teams.filter((team) => team.logoUrl || team.logo).length, [teams]);

  async function handleBulkUpload(files: FileList) {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const nextResults: UploadResult[] = [];

    for (const file of selectedFiles) {
      const matchedTeam = matchTeam(file.name, teams);
      if (!matchedTeam) {
        nextResults.push({
          fileName: file.name,
          status: "unmatched",
          message: "No unique team match found from filename",
        });
        continue;
      }

      try {
        const uploadResponse = await adminUpload(file, "team_logo", matchedTeam.id);
        await adminFetch(`/api/teams/${matchedTeam.id}`, {
          method: "PUT",
          body: JSON.stringify({
            logo: uploadResponse.url,
            logoUrl: uploadResponse.url,
          }),
        });

        nextResults.push({
          fileName: file.name,
          teamName: matchedTeam.name,
          status: "uploaded",
          message: "Uploaded successfully",
        });
      } catch (error: unknown) {
        nextResults.push({
          fileName: file.name,
          teamName: matchedTeam.name,
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    setResults(nextResults);
    setUploading(false);
    await onComplete();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const uploadedCount = results.filter((result) => result.status === "uploaded").length;
  const unmatchedCount = results.filter((result) => result.status === "unmatched").length;
  const errorCount = results.filter((result) => result.status === "error").length;

  return (
    <div className="esports-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Bulk Upload Team Logos</h3>
          <p className="mt-2 text-sm text-text-muted">
            Select multiple logo files at once. Filenames should match the team `id`, team name, or tag.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Example: `dead-eyes.png`, `DeadEyes Guys.png`, or `DE.png`
          </p>
        </div>
        <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-text-muted">
          {teamsWithLogos}/{teams.length} teams currently have logos
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (files) {
              void handleBulkUpload(files);
            }
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary disabled:opacity-60"
        >
          {uploading ? "Uploading Logos..." : "Choose Logo Files"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-accent-green/20 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
              Uploaded: {uploadedCount}
            </div>
            <div className="rounded-card border border-accent-yellow/20 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
              Unmatched: {unmatchedCount}
            </div>
            <div className="rounded-card border border-bravoRed/20 bg-bravoRed/10 px-4 py-3 text-sm text-red-300">
              Errors: {errorCount}
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-card border border-white/10">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Matched Team</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={`${result.fileName}-${result.teamName ?? "none"}`}>
                    <td className="font-mono text-xs">{result.fileName}</td>
                    <td>{result.teamName ?? "—"}</td>
                    <td
                      className={
                        result.status === "uploaded"
                          ? "text-accent-green"
                          : result.status === "unmatched"
                            ? "text-accent-yellow"
                            : "text-red-300"
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
