"use client";

import { adminFetch } from "@/lib/admin-api";
import { formatDisplayDateTime } from "@/lib/display-format";
import { scheduleEffectTask } from "@/lib/effect-task";
import { toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminRosterRequest = {
  id: string;
  teamId: string;
  teamName: string;
  requestedByName: string | null;
  requestedByEmail: string | null;
  requestType: string;
  status: "pending" | "approved" | "rejected" | "review_later";
  adminNote: string | null;
  oldPlayerName: string | null;
  newPlayerName: string | null;
  newPlayerPubgName: string | null;
  payload?: {
    candidateUrl?: unknown;
    fileName?: unknown;
  } | null;
  createdAt: string;
  updatedAt: string | null;
};

type AdminMossSubmission = {
  id: string;
  eventId: string | null;
  eventName: string | null;
  matchId: string | null;
  teamId: string;
  teamName: string;
  playerId: string | null;
  playerName: string | null;
  fileUrl: string | null;
  externalLink: string | null;
  status: "submitted" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type TeamRequestsPayload = {
  rosterRequests: AdminRosterRequest[];
  mossSubmissions: AdminMossSubmission[];
};

const textareaClass =
  "min-h-[96px] w-full rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted focus:border-accent-blue/40";

function formatTimestamp(value: string | null) {
  if (!value) return "Pending";
  return formatDisplayDateTime(value, "Pending");
}

function getStatusClasses(status: string) {
  if (status === "approved") {
    return "border-accent-green/30 bg-accent-green/10 text-accent-green";
  }

  if (status === "rejected") {
    return "border-bravoRed/30 bg-bravoRed/10 text-red-200";
  }

  if (status === "review_later") {
    return "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow";
  }

  return "border-white/10 bg-white/[0.04] text-text-muted";
}

export default function AdminTeamRequestsManager({ readOnly = false }: { readOnly?: boolean }) {
  const [data, setData] = useState<TeamRequestsPayload>({
    rosterRequests: [],
    mossSubmissions: [],
  });
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const pendingCount = useMemo(
    () =>
      data.rosterRequests.filter((request) => request.status === "pending").length +
      data.mossSubmissions.filter((submission) => submission.status === "submitted").length,
    [data],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/team-requests");
      setData(response.data ?? { rosterRequests: [], mossSubmissions: [] });
    } catch (loadError: unknown) {
      setError(
        toUserFacingErrorMessage(loadError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return scheduleEffectTask(loadData);
  }, [loadData]);

  async function handleReview(kind: "roster_request" | "moss_submission", id: string, status: string, currentNote: string | null) {
    if (readOnly) return;
    const noteKey = `${kind}:${id}`;
    setSavingKey(noteKey);
    setMessage(null);
    setError(null);

    try {
      const result = await adminFetch("/api/admin/team-requests", {
        method: "PATCH",
        body: JSON.stringify({
          kind,
          id,
          status,
          adminNote: draftNotes[noteKey] ?? currentNote ?? "",
        }),
      });
      setMessage(result.cleanupPending ? "Team request updated. Asset cleanup will be retried." : "Team request updated");
      await loadData();
    } catch (saveError: unknown) {
      setError(
        toUserFacingErrorMessage(saveError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Team Requests</h2>
        <p className="mt-1 text-sm text-text-muted">
          {readOnly
            ? "Review roster-change requests and MOSS submissions. Approval actions require a protected platform administrator."
            : "Review roster-change requests and MOSS submissions from team accounts before launch operations go live."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Roster Requests</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{data.rosterRequests.length}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">MOSS Submissions</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{data.mossSubmissions.length}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Pending Review</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{pendingCount}</p>
        </div>
      </div>

      {message || error ? (
        <div
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
          className={`rounded-card border px-4 py-3 text-sm ${
            error ? "border-bravoRed/30 bg-bravoRed/10 text-red-200" : "border-accent-green/30 bg-accent-green/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-white">Roster Requests</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-text-muted">{data.rosterRequests.length} total</span>
        </div>
        {loading ? (
          <div className="esports-card p-6 text-sm text-text-muted">Loading roster requests...</div>
        ) : data.rosterRequests.length === 0 ? (
          <div className="esports-card p-6 text-sm text-text-muted">No roster requests submitted yet.</div>
        ) : (
          <div className="space-y-4">
            {data.rosterRequests.map((request) => {
              const noteKey = `roster_request:${request.id}`;
              const canReview = !readOnly && (request.status === "pending" || request.status === "review_later");
              const requestLabel = request.requestType.replace(/_/g, " ");
              const candidateUrl =
                request.requestType === "logo_update" &&
                typeof request.payload?.candidateUrl === "string" &&
                request.payload.candidateUrl.startsWith("/api/uploads/private/")
                  ? request.payload.candidateUrl
                  : null;
              return (
                <div key={request.id} className="esports-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">{requestLabel}</p>
                      <h4 className="mt-2 text-lg font-black text-white">{request.teamName}</h4>
                      <p className="mt-2 text-sm text-text-muted">
                        Requested by {request.requestedByName ?? "Unknown user"}
                        {request.requestedByEmail ? ` · ${request.requestedByEmail}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${getStatusClasses(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {candidateUrl && (request.status === "pending" || request.status === "review_later") ? (
                    <div className="mt-4 rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Proposed Team Logo</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private authenticated routes bypass the public image optimizer */}
                        <img
                          src={candidateUrl}
                          alt={`Proposed ${request.teamName} logo`}
                          className="h-24 w-24 rounded-card border border-white/10 bg-black/20 object-contain p-2"
                        />
                        <a href={candidateUrl} target="_blank" rel="noreferrer" className="text-sm text-accent-blue hover:underline">
                          Open full candidate
                        </a>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Current Player</p>
                      <p className="mt-2 text-sm text-white">{request.oldPlayerName ?? "Not specified"}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">New Player Name</p>
                      <p className="mt-2 text-sm text-white">{request.newPlayerName ?? "Not specified"}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">New PUBG Name</p>
                      <p className="mt-2 text-sm text-white">{request.newPlayerPubgName ?? "Not specified"}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Submitted</p>
                      <p className="mt-2 text-sm text-white">{formatTimestamp(request.createdAt)}</p>
                    </div>
                  </div>

                  {canReview ? (
                    <>
                      <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Admin Note</label>
                        <textarea
                          className={`${textareaClass} mt-2`}
                          value={draftNotes[noteKey] ?? request.adminNote ?? ""}
                          onChange={(event) =>
                            setDraftNotes((current) => ({
                              ...current,
                              [noteKey]: event.target.value,
                            }))
                          }
                          aria-label="Add review notes, roster conditions, or follow-up instructions."
                          placeholder="Add review notes, roster conditions, or follow-up instructions."
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReview("roster_request", request.id, "approved", request.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-primary disabled:opacity-60"
                        >
                          {savingKey === noteKey ? "Saving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview("roster_request", request.id, "review_later", request.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-secondary"
                        >
                          Review Later
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview("roster_request", request.id, "rejected", request.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-watch-live !text-[11px]"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]">Admin Note</p>
                      <p className="mt-2 text-slate-300">{request.adminNote || "No review note recorded."}</p>
                      <p className="mt-2 text-xs">
                        {readOnly ? "Read-only for your role." : "This request is final and cannot be reviewed again."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-white">MOSS Submissions</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-text-muted">{data.mossSubmissions.length} total</span>
        </div>
        {loading ? (
          <div className="esports-card p-6 text-sm text-text-muted">Loading MOSS submissions...</div>
        ) : data.mossSubmissions.length === 0 ? (
          <div className="esports-card p-6 text-sm text-text-muted">No MOSS submissions uploaded yet.</div>
        ) : (
          <div className="space-y-4">
            {data.mossSubmissions.map((submission) => {
              const noteKey = `moss_submission:${submission.id}`;
              const canReview = !readOnly && submission.status === "submitted";
              return (
                <div key={submission.id} className="esports-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">MOSS Submission</p>
                      <h4 className="mt-2 text-lg font-black text-white">{submission.teamName}</h4>
                      <p className="mt-2 text-sm text-text-muted">
                        {submission.eventName ?? "Event pending"}
                        {submission.matchId ? ` · Match ${submission.matchId}` : ""}
                        {submission.playerName ? ` · ${submission.playerName}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${getStatusClasses(submission.status)}`}
                    >
                      {submission.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Submitted</p>
                      <p className="mt-2 text-sm text-white">{formatTimestamp(submission.createdAt)}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">File</p>
                      {submission.fileUrl ? (
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-sm text-accent-blue hover:underline"
                        >
                          Open uploaded file
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-text-muted">No file attached</p>
                      )}
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">External Link</p>
                      {submission.externalLink ? (
                        <a
                          href={submission.externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-sm text-accent-blue hover:underline"
                        >
                          Open reference
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-text-muted">No external link</p>
                      )}
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Latest Update</p>
                      <p className="mt-2 text-sm text-white">{formatTimestamp(submission.updatedAt ?? submission.createdAt)}</p>
                    </div>
                  </div>

                  {canReview ? (
                    <>
                      <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Admin Note</label>
                        <textarea
                          className={`${textareaClass} mt-2`}
                          value={draftNotes[noteKey] ?? submission.adminNote ?? ""}
                          onChange={(event) =>
                            setDraftNotes((current) => ({
                              ...current,
                              [noteKey]: event.target.value,
                            }))
                          }
                          aria-label="Add approval notes, missing evidence requests, or follow-up instructions."
                          placeholder="Add approval notes, missing evidence requests, or follow-up instructions."
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReview("moss_submission", submission.id, "approved", submission.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-primary disabled:opacity-60"
                        >
                          {savingKey === noteKey ? "Saving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview("moss_submission", submission.id, "submitted", submission.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-secondary"
                        >
                          Keep Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview("moss_submission", submission.id, "rejected", submission.adminNote)}
                          disabled={savingKey === noteKey}
                          className="btn-watch-live !text-[11px]"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]">Admin Note</p>
                      <p className="mt-2 text-slate-300">{submission.adminNote || "No review note recorded."}</p>
                      <p className="mt-2 text-xs">
                        {readOnly ? "Read-only for your role." : "This submission is final and cannot be reviewed again."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
