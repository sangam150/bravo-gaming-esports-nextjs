"use client";

import { adminFetch } from "@/lib/admin-api";
import { useCallback, useEffect, useState } from "react";

type JsonRecord = Record<string, unknown>;

type LinkingSettings = {
  enabled: boolean;
  requiredMatchCount: number;
  requireSameSlot: boolean;
  activationMode: "global" | "allowlist";
  membershipMode: "auto_activate" | "pending_review";
  allowedEventIds: string[];
  allowedSeasonIds: string[];
};

type LinkingDashboard = {
  available: boolean;
  evidence: JsonRecord[];
  memberships: JsonRecord[];
  reviews: JsonRecord[];
  settings: LinkingSettings;
};

const defaultSettings: LinkingSettings = {
  enabled: true,
  requiredMatchCount: 5,
  requireSameSlot: true,
  activationMode: "global",
  membershipMode: "auto_activate",
  allowedEventIds: [],
  allowedSeasonIds: [],
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function records(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readSettings(value: unknown): LinkingSettings {
  const input = record(value);
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : defaultSettings.enabled,
    requiredMatchCount: typeof input.required_match_count === "number" ? input.required_match_count : defaultSettings.requiredMatchCount,
    requireSameSlot: typeof input.require_same_slot === "boolean" ? input.require_same_slot : defaultSettings.requireSameSlot,
    activationMode: input.activation_mode === "allowlist" ? "allowlist" : "global",
    membershipMode: input.membership_mode === "pending_review" ? "pending_review" : "auto_activate",
    allowedEventIds: strings(input.allowed_event_ids),
    allowedSeasonIds: strings(input.allowed_season_ids),
  };
}

function readDashboard(value: unknown): LinkingDashboard {
  const input = record(value);
  if (input.status === "unavailable") {
    return {
      available: false,
      evidence: [],
      memberships: [],
      reviews: [],
      settings: defaultSettings,
    };
  }
  return {
    available: true,
    evidence: records(input.evidence),
    memberships: records(input.memberships),
    reviews: records(input.reviews),
    settings: readSettings(input.settings),
  };
}

function text(value: unknown, fallback = "—") {
  return typeof value === "string" && value ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : 0;
}

async function fetchLinkingDashboard() {
  const payload = (await adminFetch("/api/admin/player-team-linking", { cache: "no-store" })) as { data?: unknown };
  return readDashboard(payload.data);
}

export default function AdminPlayerTeamLinkingManager() {
  const [dashboard, setDashboard] = useState<LinkingDashboard | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const nextDashboard = await fetchLinkingDashboard();
    setDashboard(nextDashboard);
    setSettings(nextDashboard.settings);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchLinkingDashboard()
      .then((nextDashboard) => {
        if (!active) return;
        setDashboard(nextDashboard);
        setSettings(nextDashboard.settings);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Unable to load player/team linking.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function request(path: string, init: RequestInit) {
    setBusy(path);
    setMessage("");
    try {
      await adminFetch(path, init);
      await load();
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The operation failed.");
    } finally {
      setBusy(null);
    }
  }

  function saveSettings() {
    return request("/api/admin/player-team-linking", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  function recalculate() {
    return request("/api/admin/player-team-linking/recalculate", {
      method: "POST",
      body: JSON.stringify({ pubgAccountId: accountId.trim() || null }),
    });
  }

  function resolveReview(id: string, decision: "approve_transfer" | "keep_existing" | "reject" | "mark_substitute") {
    return request(`/api/admin/player-team-linking/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ decision, note: reviewNotes[id]?.trim() || null }),
    });
  }

  function unlinkMembership(id: string) {
    const reason = reviewNotes[id]?.trim();
    if (!reason) {
      setMessage("Enter an audit note before unlinking a membership.");
      return Promise.resolve();
    }
    return request(`/api/admin/player-team-linking/memberships/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
  }

  const pendingReviews = dashboard?.reviews.filter((item) => item.status === "pending") ?? [];
  const activeMemberships = dashboard?.memberships.filter((item) => item.status === "active") ?? [];

  return (
    <section className="space-y-6" aria-labelledby="player-team-linking-title">
      <header>
        <h2 id="player-team-linking-title" className="text-xl font-semibold text-white">
          Automatic player-team linking
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Links a PUBG account after five distinct published matches for the same canonical team and slot. Team-workspace authorization
          remains separate.
        </p>
      </header>

      {message ? (
        <p className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" role="status">
          {message}
        </p>
      ) : null}

      {dashboard && !dashboard.available ? (
        <p className="rounded border border-amber-700 bg-amber-950/30 px-3 py-2 text-sm text-amber-100" role="status">
          Migration 022 is not applied. Match publishing remains available, but automatic player-team linking is safely disabled until the
          database rotation and migration are completed.
        </p>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
          />
          Enable automatic linking
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Required distinct matches
          <input
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            type="number"
            min={5}
            max={5}
            value={settings.requiredMatchCount}
            disabled
            readOnly
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={settings.requireSameSlot} disabled readOnly />
          Require the same slot (locked safety rule)
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Activation
          <select
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={settings.activationMode}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                activationMode: event.target.value === "allowlist" ? "allowlist" : "global",
              }))
            }
          >
            <option value="global">All published competitions</option>
            <option value="allowlist">Only selected events or seasons</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Fifth-match action
          <select
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={settings.membershipMode}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                membershipMode: event.target.value === "pending_review" ? "pending_review" : "auto_activate",
              }))
            }
          >
            <option value="auto_activate">Activate automatically</option>
            <option value="pending_review">Require admin approval</option>
          </select>
        </label>
        {settings.activationMode === "allowlist" ? (
          <>
            <label className="grid gap-1 text-sm text-slate-200">
              Event UUIDs (comma separated)
              <input
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
                value={settings.allowedEventIds.join(", ")}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    allowedEventIds: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Season UUIDs (comma separated)
              <input
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
                value={settings.allowedSeasonIds.join(", ")}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    allowedSeasonIds: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
          </>
        ) : null}
        <button
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy !== null || dashboard?.available === false}
          onClick={() => void saveSettings()}
          type="button"
        >
          Save linking policy
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-4 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          placeholder="Optional PUBG account ID; blank recalculates all"
        />
        <button
          className="rounded border border-blue-500 px-4 py-2 text-sm text-blue-200 disabled:opacity-50"
          disabled={busy !== null || dashboard?.available === false}
          onClick={() => void recalculate()}
          type="button"
        >
          Recalculate evidence
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-white">Pending conflicts ({pendingReviews.length})</h3>
        {pendingReviews.length === 0 ? <p className="text-sm text-slate-400">No transfer conflicts require review.</p> : null}
        {pendingReviews.map((item) => {
          const id = text(item.id, "");
          return (
            <article key={id} className="space-y-3 rounded-lg border border-amber-700/50 bg-amber-950/10 p-4">
              <p className="text-sm text-slate-200">
                <strong>{text(item.player_name, text(item.pubg_account_id))}</strong> ({text(item.pubg_account_id)}):{" "}
                {text(item.current_team_name, "No current team")} → {text(item.proposed_team_name, text(item.proposed_team_id))} (slot{" "}
                {number(item.proposed_slot_number)}, {number(item.qualifying_match_count)} matches)
              </p>
              <p className="text-xs text-slate-400">Reason: {text(item.reason, "team_conflict")}</p>
              <textarea
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={reviewNotes[id] ?? ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [id]: event.target.value }))}
                placeholder="Required audit note for transfer; optional for other decisions"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void resolveReview(id, "approve_transfer")}
                  className="rounded bg-blue-600 px-3 py-2 text-sm"
                >
                  Approve link / transfer
                </button>
                <button
                  type="button"
                  onClick={() => void resolveReview(id, "keep_existing")}
                  className="rounded border border-slate-600 px-3 py-2 text-sm"
                >
                  Keep existing
                </button>
                <button
                  type="button"
                  onClick={() => void resolveReview(id, "mark_substitute")}
                  className="rounded border border-slate-600 px-3 py-2 text-sm"
                >
                  Mark substitute
                </button>
                <button
                  type="button"
                  onClick={() => void resolveReview(id, "reject")}
                  className="rounded border border-red-700 px-3 py-2 text-sm text-red-200"
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-white">Active competitive memberships ({activeMemberships.length})</h3>
        {activeMemberships.length === 0 ? <p className="text-sm text-slate-400">No active match-history links.</p> : null}
        {activeMemberships.map((item) => {
          const id = text(item.id, "");
          return (
            <article key={id} className="grid gap-3 rounded-lg border border-slate-800 p-4 md:grid-cols-[1fr_1fr_auto]">
              <p className="text-sm text-slate-200">
                {text(item.player_name, text(item.pubg_account_id))} · {text(item.team_name, text(item.team_id))} · slot{" "}
                {number(item.slot_number)}
              </p>
              <input
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={reviewNotes[id] ?? ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [id]: event.target.value }))}
                placeholder="Required unlink reason"
              />
              <button
                type="button"
                className="rounded border border-red-700 px-3 py-2 text-sm text-red-200"
                onClick={() => void unlinkMembership(id)}
              >
                Unlink
              </button>
            </article>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-white">Match-history evidence ({dashboard?.evidence.length ?? 0})</h3>
        {dashboard?.evidence.length === 0 ? <p className="text-sm text-slate-400">No eligible evidence has been recorded.</p> : null}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">PUBG account</th>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">Slot</th>
                <th className="px-3 py-2 font-medium">Matches</th>
                <th className="px-3 py-2 font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {dashboard?.evidence.map((item) => (
                <tr key={text(item.id)}>
                  <td className="px-3 py-2">{text(item.pubg_account_id)}</td>
                  <td className="px-3 py-2">{text(item.team_name, text(item.team_id))}</td>
                  <td className="px-3 py-2">{number(item.slot_number)}</td>
                  <td className="px-3 py-2">
                    {number(item.qualifying_match_count)} / {number(item.required_match_count)}
                  </td>
                  <td className="px-3 py-2">{text(item.state)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dashboard?.evidence.map((item) => (
          <details key={`evidence-${text(item.id)}`} className="rounded border border-slate-800 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-slate-300">
              {text(item.player_name, text(item.pubg_account_id))} · evidence and slot history
            </summary>
            <p className="mt-2 break-all text-xs text-slate-400">
              Qualifying match IDs: {strings(item.qualifying_match_ids).join(", ") || "—"}
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
              {JSON.stringify(item.slot_history ?? [], null, 2)}
            </pre>
          </details>
        ))}
      </div>

      <p className="text-xs text-slate-500">Discord relational team authorization is not changed by this manager.</p>
    </section>
  );
}
