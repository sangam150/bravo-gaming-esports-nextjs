"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { useCallback, useEffect, useMemo, useState } from "react";

type Candidate = {
  id: string;
  source_type: string;
  source_identifier: string;
  displayed_name: string;
  team_tag: string | null;
  slug: string | null;
  aliases: unknown;
  evidence: {
    eventParticipation?: string[];
    matchCount?: number;
    playerCount?: number;
    discordRoles?: Array<{ roleId: string; roleName: string }>;
  };
  confidence: number | null;
  conflict_warnings: unknown;
  proposed_team_id: string | null;
  proposed_action: string;
  review_status: string;
  owner_note: string | null;
};

type OfficialTeam = {
  id: string;
  name: string;
  tag: string | null;
  slug: string | null;
};

function normalizeTeamIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export default function AdminTeamReconciliationManager() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teams, setTeams] = useState<OfficialTeam[]>([]);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await adminFetch("/api/admin/team-reconciliation");
      setCandidates(response.data.candidates ?? []);
      setTeams(response.data.teams ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Reconciliation inventory could not be loaded.");
    }
  }, []);

  useEffect(() => scheduleEffectTask(load), [load]);

  const visible = useMemo(
    () =>
      candidates
        .filter((candidate) => filter === "all" || candidate.review_status === filter)
        .sort((left, right) => {
          const leftPriority = left.evidence?.eventParticipation?.some((event) => event.toLowerCase().includes("mahasangram")) ? 0 : 1;
          const rightPriority = right.evidence?.eventParticipation?.some((event) => event.toLowerCase().includes("mahasangram")) ? 0 : 1;
          return leftPriority - rightPriority || left.displayed_name.localeCompare(right.displayed_name);
        }),
    [candidates, filter],
  );

  async function submit(candidate: Candidate, action: string, form: HTMLFormElement) {
    setBusy(candidate.id);
    setError(null);
    try {
      const values = new FormData(form);
      await adminFetch("/api/admin/team-reconciliation", {
        method: "POST",
        body: JSON.stringify({
          action,
          candidateId: candidate.id,
          canonicalName: values.get("canonicalName"),
          tag: values.get("tag"),
          slug: values.get("slug"),
          status: values.get("status"),
          teamId: values.get("teamId"),
          ownerNote: values.get("ownerNote"),
        }),
      });
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Owner decision could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="section-title">Owner Reconciliation</p>
        <h2 className="mt-2 font-display text-2xl font-black uppercase">Team Identity Inventory</h2>
        <p className="mt-2 max-w-4xl text-sm text-text-muted">
          Compatibility records, relational teams, Discord roles, memberships, and event snapshots remain separate. Every create or link
          below is an explicit owner decision and preserves the original source identity.
        </p>
      </div>
      <div className="tab-bar">
        {["pending", "changes_requested", "resolved", "rejected", "all"].map((value) => (
          <button
            key={value}
            type="button"
            className={`tab-item ${filter === value ? "tab-item-active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {value.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-card border border-red-500/30 bg-red-500/10 p-4 text-red-100">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        {visible.map((candidate) => {
          const warnings = Array.isArray(candidate.conflict_warnings)
            ? candidate.conflict_warnings.filter((value): value is string => typeof value === "string")
            : [];
          const discordRoles = Array.isArray(candidate.evidence?.discordRoles) ? candidate.evidence.discordRoles : [];
          const aliases = Array.isArray(candidate.aliases)
            ? candidate.aliases.filter((value): value is string => typeof value === "string")
            : [];
          const events = Array.isArray(candidate.evidence?.eventParticipation) ? candidate.evidence.eventParticipation : [];
          const identity = normalizeTeamIdentity(candidate.displayed_name);
          const possibleMatches = teams.filter(
            (team) =>
              normalizeTeamIdentity(team.name) === identity ||
              (candidate.team_tag && normalizeTeamIdentity(team.tag ?? "") === normalizeTeamIdentity(candidate.team_tag)) ||
              (candidate.slug && team.slug === candidate.slug),
          );
          const isMahasangram = events.some((event) => event.toLowerCase().includes("mahasangram"));
          return (
            <form key={candidate.id} className="esports-card" onSubmit={(event) => event.preventDefault()}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{candidate.source_type}</p>
                  <h3 className="mt-1 font-display text-xl font-black uppercase">{candidate.displayed_name}</h3>
                  <p className="mt-1 font-mono text-xs text-text-muted">{candidate.source_identifier}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isMahasangram ? (
                    <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs uppercase text-sky-100">
                      Mahasangram priority
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase">{candidate.review_status}</span>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-text-muted">Tag</dt>
                  <dd>{candidate.team_tag || "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Matches</dt>
                  <dd>{candidate.evidence?.matchCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Players</dt>
                  <dd>{candidate.evidence?.playerCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Confidence</dt>
                  <dd>{candidate.confidence == null ? "—" : `${Math.round(candidate.confidence * 100)}% suggestion only`}</dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-3 text-xs text-text-muted md:grid-cols-3">
                <div>
                  <span className="text-white">Aliases:</span> {aliases.length ? aliases.join(", ") : "None recorded"}
                </div>
                <div>
                  <span className="text-white">Historical events:</span> {events.length ? events.join(", ") : "None recorded"}
                </div>
                <div>
                  <span className="text-white">Possible relational match:</span>{" "}
                  {possibleMatches.length ? possibleMatches.map((team) => `${team.name} (${team.id})`).join(", ") : "No exact match"}
                </div>
              </div>
              {discordRoles.map((role) => (
                <p key={role.roleId} className="mt-2 text-xs text-text-muted">
                  Discord: {role.roleName} · {role.roleId}
                </p>
              ))}
              {warnings.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {warnings.map((warning) => (
                    <span
                      key={warning}
                      className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] uppercase text-amber-100"
                    >
                      {warning.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              ) : null}
              {candidate.review_status !== "resolved" ? (
                <>
                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <input
                      name="canonicalName"
                      defaultValue={candidate.displayed_name}
                      aria-label="Canonical team name"
                      className="input-field"
                    />
                    <input name="tag" defaultValue={candidate.team_tag ?? ""} aria-label="Canonical team tag" className="input-field" />
                    <input name="slug" defaultValue={candidate.slug ?? ""} aria-label="Canonical team slug" className="input-field" />
                    <select name="status" aria-label="Team status" className="input-field">
                      <option value="active">Active</option>
                      <option value="archived">Historical / archived</option>
                    </select>
                    <select name="teamId" aria-label="Existing relational team" className="input-field md:col-span-2">
                      <option value="">Select existing team for link</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.tag || "no tag"})
                        </option>
                      ))}
                    </select>
                    <input
                      name="ownerNote"
                      defaultValue={candidate.owner_note ?? ""}
                      aria-label="Owner review note"
                      placeholder="Owner review note"
                      className="input-field md:col-span-2"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-primary"
                      onClick={(event) => submit(candidate, "approve_create", event.currentTarget.form!)}
                    >
                      Approve new official team
                    </button>
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "approve_link", event.currentTarget.form!)}
                    >
                      Approve link
                    </button>
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "merge_duplicate", event.currentTarget.form!)}
                    >
                      Merge duplicate into selected team
                    </button>
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "preserve_historical", event.currentTarget.form!)}
                    >
                      Preserve historical-only team
                    </button>
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "archive", event.currentTarget.form!)}
                    >
                      Create archived team
                    </button>
                    {candidate.source_type === "discord_role" ? (
                      <button
                        type="button"
                        disabled={busy === candidate.id}
                        className="btn-secondary"
                        onClick={(event) => submit(candidate, "reject_discord_role", event.currentTarget.form!)}
                      >
                        Reject incorrect Discord role
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "request_information", event.currentTarget.form!)}
                    >
                      Request information
                    </button>
                    <button
                      type="button"
                      disabled={busy === candidate.id}
                      className="btn-secondary"
                      onClick={(event) => submit(candidate, "leave_unresolved", event.currentTarget.form!)}
                    >
                      Leave unresolved
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-green-200">Owner-approved linkage: {candidate.proposed_team_id}</p>
              )}
            </form>
          );
        })}
      </div>
    </section>
  );
}
