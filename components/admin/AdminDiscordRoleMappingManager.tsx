"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "./AuthProvider";

type Mapping = {
  discord_role_id: string;
  discord_role_name: string;
  role_position: number;
  managed_by_discord: boolean;
  mapping_type: string;
  application_role: string | null;
  team_id: string | null;
  enabled: boolean;
  last_verified_at: string | null;
};

type TeamOption = {
  id: string;
  name: string;
  tag: string | null;
  is_active: boolean;
};

type AccessReview = {
  id: string;
  category: string;
  status: string;
  discord_user_id: string;
  discord_role_ids: string[];
  candidate_team_ids: string[];
  details: Record<string, unknown>;
  created_at: string;
};

const mappingTypes = ["ignored", "access", "team_function", "team_identity", "verification", "cosmetic", "bot", "deny"];
const applicationRoles = ["", "admin", "organizer", "moderator", "team_manager", "team_igl", "coach", "player", "viewer"];

export default function AdminDiscordRoleMappingManager() {
  const { role } = useAdminAuth();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/discord-role-mappings");
      setMappings(response.data.mappings ?? []);
      setTeams(response.data.teams ?? []);
      setReviews(response.data.reviews ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Discord role mappings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return scheduleEffectTask(() => (role === "super_admin" ? load() : setLoading(false)));
  }, [load, role]);

  function updateLocal(roleId: string, patch: Partial<Mapping>) {
    setMappings((current) => current.map((mapping) => (mapping.discord_role_id === roleId ? { ...mapping, ...patch } : mapping)));
  }

  async function syncCatalog() {
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminFetch("/api/admin/discord-role-mappings", {
        method: "POST",
        body: JSON.stringify({ action: "sync" }),
      });
      setMessage(`Synchronized ${result.data.synchronized} Discord roles.`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Discord roles could not be synchronized.");
    } finally {
      setSyncing(false);
    }
  }

  async function save(mapping: Mapping) {
    setSavingRoleId(mapping.discord_role_id);
    setMessage(null);
    setError(null);
    try {
      await adminFetch("/api/admin/discord-role-mappings", {
        method: "POST",
        body: JSON.stringify({
          roleId: mapping.discord_role_id,
          mappingType: mapping.mapping_type,
          applicationRole: mapping.application_role,
          teamId: mapping.team_id,
          enabled: mapping.enabled,
        }),
      });
      setMessage(`${mapping.discord_role_name} mapping saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The mapping could not be saved.");
    } finally {
      setSavingRoleId(null);
    }
  }

  if (role !== "super_admin") {
    return (
      <main className="page-shell">
        <div className="esports-card mx-auto max-w-xl p-8 text-center">
          <h1 className="font-display text-2xl font-black uppercase">Owner access required</h1>
          <p className="mt-3 text-text-muted">Only the manually assigned super admin can manage Discord role mappings.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-inner space-y-5">
        <section className="page-hero">
          <p className="section-title">Authentication</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="section-heading">Discord Role Mapping</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
                Function roles describe what a member does. Team identity roles link numeric Discord roles to existing Bravo teams,
                including teams added later.
              </p>
            </div>
            <button type="button" onClick={() => void syncCatalog()} disabled={syncing} className="btn-primary">
              {syncing ? "Synchronizing..." : "Synchronize Discord Roles"}
            </button>
          </div>
        </section>

        {message ? (
          <p role="status" className="rounded-card border border-green-500/30 bg-green-500/10 p-4 text-green-100">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-card border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            {error}
          </p>
        ) : null}

        <section className="esports-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-title">Owner review queue</p>
              <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Discord and team conflicts</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-text-muted">{reviews.length} open</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-card border border-amber-400/20 bg-amber-400/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">{review.category.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-white">
                  {review.discord_user_id === "guild-role-catalog" ? "Discord role catalog" : `Discord member ${review.discord_user_id}`}
                </p>
                <p className="mt-2 break-all font-mono text-xs text-text-muted">Roles: {review.discord_role_ids.join(", ") || "None"}</p>
                <p className="mt-2 text-xs text-text-muted">
                  Candidate teams: {review.candidate_team_ids.length || "None"} · {new Date(review.created_at).toLocaleString()}
                </p>
              </article>
            ))}
            {!loading && reviews.length === 0 ? (
              <p className="rounded-card border border-white/10 p-4 text-sm text-text-muted">No open Discord access conflicts.</p>
            ) : null}
          </div>
        </section>

        <section className="esports-card overflow-hidden !p-0">
          <div className="table-scroll">
            <table className="data-table min-w-[1100px] w-full">
              <thead>
                <tr>
                  <th>Discord role</th>
                  <th>Role ID</th>
                  <th>Category</th>
                  <th>Bravo role</th>
                  <th>Bravo team</th>
                  <th>Enabled</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.discord_role_id}>
                    <td>
                      <p className="font-semibold text-white">{mapping.discord_role_name}</p>
                      <p className="text-xs text-text-muted">
                        Position {mapping.role_position}
                        {mapping.managed_by_discord ? " · managed" : ""}
                      </p>
                    </td>
                    <td className="font-mono text-xs">{mapping.discord_role_id}</td>
                    <td>
                      <select
                        className="input-esports min-w-40"
                        value={mapping.mapping_type}
                        onChange={(event) =>
                          updateLocal(mapping.discord_role_id, {
                            mapping_type: event.target.value,
                            team_id: event.target.value === "team_identity" ? mapping.team_id : null,
                          })
                        }
                      >
                        {mappingTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input-esports min-w-36"
                        value={mapping.application_role ?? ""}
                        disabled={!["access", "team_function"].includes(mapping.mapping_type)}
                        onChange={(event) =>
                          updateLocal(mapping.discord_role_id, {
                            application_role: event.target.value || null,
                          })
                        }
                      >
                        {applicationRoles.map((applicationRole) => (
                          <option key={applicationRole || "none"} value={applicationRole}>
                            {applicationRole || "None"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input-esports min-w-48"
                        value={mapping.team_id ?? ""}
                        disabled={mapping.mapping_type !== "team_identity"}
                        onChange={(event) =>
                          updateLocal(mapping.discord_role_id, {
                            team_id: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Select team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                            {team.tag ? ` (${team.tag})` : ""}
                            {team.is_active ? "" : " · inactive"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={(event) =>
                          updateLocal(mapping.discord_role_id, {
                            enabled: event.target.checked,
                          })
                        }
                        aria-label={`Enable ${mapping.discord_role_name}`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={savingRoleId === mapping.discord_role_id}
                        onClick={() => void save(mapping)}
                      >
                        {savingRoleId === mapping.discord_role_id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && mappings.length === 0 ? (
            <p className="p-6 text-text-muted">Synchronize the Discord catalog to begin mapping roles.</p>
          ) : null}
          {loading ? <p className="p-6 text-text-muted">Loading Discord role mappings...</p> : null}
        </section>
      </div>
    </main>
  );
}
