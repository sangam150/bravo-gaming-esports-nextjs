"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminTeamReconciliationManager from "./AdminTeamReconciliationManager";

type RegisteredTeam = {
  id: string;
  name: string;
  tag: string | null;
  slug: string | null;
  status: string;
  verification_status: string;
  discord_mapping_status: string;
  updated_at: string;
  primaryIgl: { display_name: string | null; email: string } | null;
  managers: Array<{ id: string }>;
  coaches: Array<{ id: string }>;
  rosterCount: number;
  discordMappings: Array<{
    discord_role_id: string;
    discord_role_name: string;
    mapping_status: string;
    enabled: boolean;
  }>;
  registrationCount: number;
  warnings: string[];
};

export default function AdminRegisteredTeamsManager() {
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/registered-teams");
      setTeams(response.data.teams ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Registered teams could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => scheduleEffectTask(load), [load]);

  const visible = useMemo(
    () =>
      teams.filter((team) => {
        if (filter === "all") return true;
        if (filter === "active" || filter === "archived") return team.status === filter;
        return team.warnings.includes(filter);
      }),
    [filter, teams],
  );

  return (
    <section className="space-y-5">
      <div>
        <p className="section-title">Teams</p>
        <h2 className="mt-2 font-display text-2xl font-black uppercase">Registered Teams</h2>
        <p className="mt-2 text-sm text-text-muted">
          Official teams, website registrations, memberships, and Discord mappings remain separate and auditable.
        </p>
      </div>
      <div className="tab-bar">
        {[
          "all",
          "active",
          "archived",
          "missing_igl",
          "missing_manager",
          "missing_discord_mapping",
          "discord_role_missing",
          "archived_mapping_conflict",
          "open_review",
        ].map((value) => (
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
      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((team) => (
          <article key={team.id} className="esports-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Official Team</p>
                <h3 className="mt-1 font-display text-xl font-black uppercase">{team.name}</h3>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  {team.tag || "No tag"} · {team.id}
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase">{team.status}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Verification</dt>
                <dd>{team.verification_status}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Discord mapping</dt>
                <dd>{team.discord_mapping_status}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Primary IGL</dt>
                <dd>{team.primaryIgl?.display_name ?? team.primaryIgl?.email ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Roster</dt>
                <dd>{team.rosterCount}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Managers / Coaches</dt>
                <dd>
                  {team.managers.length} / {team.coaches.length}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Registrations</dt>
                <dd>{team.registrationCount}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-white/10 pt-4">
              {team.discordMappings.map((mapping) => (
                <p key={mapping.discord_role_id} className="text-xs text-text-muted">
                  {mapping.discord_role_name} · {mapping.discord_role_id} · {mapping.mapping_status}
                </p>
              ))}
              {team.warnings.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.warnings.map((warning) => (
                    <span
                      key={warning}
                      className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] uppercase text-amber-100"
                    >
                      {warning.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-green-200">No onboarding conflicts detected.</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {loading ? <p className="text-text-muted">Loading registered teams...</p> : null}
      <div className="border-t border-white/10 pt-8">
        <AdminTeamReconciliationManager />
      </div>
    </section>
  );
}
