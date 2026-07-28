"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import type { TeamMappingState } from "@/lib/team-mapping-state";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminSection } from "./AdminSidebar";
import AdminTeamReconciliationManager from "./AdminTeamReconciliationManager";

type TeamPerson = {
  id: string;
  display_name: string | null;
  email: string;
  role?: string | null;
  is_active?: boolean | null;
};

type RegisteredTeam = {
  id: string;
  name: string;
  tag: string | null;
  slug: string | null;
  logo_url: string | null;
  status: string;
  verification_status: string;
  updated_at: string;
  primaryIgl: TeamPerson | null;
  managers: TeamPerson[];
  coaches: TeamPerson[];
  memberCandidates: TeamPerson[];
  rosterCount: number;
  mappingState: TeamMappingState;
  discordMappings: Array<{
    discord_role_id: string;
    discord_role_name: string;
    mapping_status: string;
    enabled: boolean;
  }>;
  registrationCount: number;
  warnings: string[];
};

type TeamSummary = {
  total: number;
  active: number;
  archived: number;
  missingLogo: number;
  missingIgl: number;
  missingManager: number;
  missingDiscordMapping: number;
  openReviews: number;
};

type RegisteredTeamsManagerProps = {
  onNavigate?: (section: AdminSection) => void;
  onEditTeam?: (teamId: string | null) => void;
  onManageRoster?: (teamId: string) => void;
  onOpenLogoUpload?: () => void;
  onArchiveTeam?: (teamId: string) => Promise<boolean | void> | boolean | void;
};

const emptySummary: TeamSummary = {
  total: 0,
  active: 0,
  archived: 0,
  missingLogo: 0,
  missingIgl: 0,
  missingManager: 0,
  missingDiscordMapping: 0,
  openReviews: 0,
};

const mappingLabels: Record<TeamMappingState, string> = {
  mapped: "Mapped",
  unmapped: "No Discord role linked",
  pending_review: "Pending review",
  role_missing: "Discord role missing",
  conflict: "Mapping conflict",
  disabled: "Mapping disabled",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function mappingTone(state: TeamMappingState) {
  if (state === "mapped") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (state === "unmapped" || state === "disabled") return "border-white/10 bg-white/5 text-text-muted";
  if (state === "conflict" || state === "role_missing") return "border-red-400/30 bg-red-400/10 text-red-100";
  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function TeamLogo({ team, size = 44 }: { team: RegisteredTeam; size?: number }) {
  return team.logo_url ? (
    <Image
      src={team.logo_url}
      alt={`${team.name} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-lg border border-white/10 object-contain"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-label={`${team.name} has no logo`}
      className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-[9px] font-bold uppercase text-text-muted"
      style={{ width: size, height: size }}
    >
      No logo
    </span>
  );
}

export default function AdminRegisteredTeamsManager({
  onNavigate,
  onEditTeam,
  onManageRoster,
  onOpenLogoUpload,
  onArchiveTeam,
}: RegisteredTeamsManagerProps) {
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [summary, setSummary] = useState<TeamSummary>(emptySummary);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [mappingFilter, setMappingFilter] = useState<TeamMappingState | "all">("all");
  const [warningFilter, setWarningFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDraft, setAccessDraft] = useState({ team_igl: "", team_manager: "" });
  const [savingAccessRole, setSavingAccessRole] = useState<"team_igl" | "team_manager" | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const detailDrawerRef = useRef<HTMLElement>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/registered-teams");
      setTeams(response.data.teams ?? []);
      setSummary(response.data.summary ?? emptySummary);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Registered teams could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => scheduleEffectTask(load), [load]);

  useEffect(() => {
    if (!selectedTeamId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailDrawerRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedTeamId(null);
        return;
      }
      if (event.key !== "Tab" || !detailDrawerRef.current) return;

      const focusableItems = Array.from(
        detailDrawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((item) => item.offsetParent !== null);
      const firstItem = focusableItems[0];
      const lastItem = focusableItems.at(-1);
      if (!firstItem || !lastItem) return;

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => detailTriggerRef.current?.focus());
    };
  }, [selectedTeamId]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return teams
      .filter((team) => {
        if (needle && ![team.name, team.tag, team.slug].some((value) => value?.toLowerCase().includes(needle))) return false;
        if (statusFilter !== "all" && team.status !== statusFilter) return false;
        if (verificationFilter !== "all" && team.verification_status !== verificationFilter) return false;
        if (mappingFilter !== "all" && team.mappingState !== mappingFilter) return false;
        if (warningFilter !== "all" && !team.warnings.includes(warningFilter)) return false;
        return true;
      })
      .sort((left, right) => {
        if (sort === "name") return left.name.localeCompare(right.name);
        if (sort === "roster") return right.rosterCount - left.rosterCount || left.name.localeCompare(right.name);
        if (sort === "warnings") return right.warnings.length - left.warnings.length || left.name.localeCompare(right.name);
        return right.updated_at.localeCompare(left.updated_at) || left.name.localeCompare(right.name);
      });
  }, [mappingFilter, search, sort, statusFilter, teams, verificationFilter, warningFilter]);

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId) ?? null, [selectedTeamId, teams]);
  const canManageTeams = Boolean(onEditTeam);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedVisible = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openTeamDetails(teamId: string) {
    const team = teams.find((candidate) => candidate.id === teamId);
    detailTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAccessDraft({
      team_igl: team?.primaryIgl?.id ?? team?.memberCandidates[0]?.id ?? "",
      team_manager: team?.managers[0]?.id ?? team?.memberCandidates[0]?.id ?? "",
    });
    setDetailMessage(null);
    setSelectedTeamId(teamId);
  }

  async function assignTeamAccess(accessRole: "team_igl" | "team_manager") {
    if (!selectedTeam) return;
    const profileId = accessDraft[accessRole];
    if (!profileId) {
      setDetailMessage("Choose a verified profile before assigning team access.");
      return;
    }

    setSavingAccessRole(accessRole);
    setDetailMessage(null);
    try {
      const response = await adminFetch(`/api/admin/teams/${encodeURIComponent(selectedTeam.id)}/access`, {
        method: "PATCH",
        body: JSON.stringify({ profileId, accessRole }),
      });
      setDetailMessage(response.message ?? "Team access updated.");
      await load();
    } catch (assignmentError) {
      setDetailMessage(assignmentError instanceof Error ? assignmentError.message : "Team access could not be updated.");
    } finally {
      setSavingAccessRole(null);
    }
  }

  function navigate(section: AdminSection) {
    setSelectedTeamId(null);
    onNavigate?.(section);
  }

  function editTeam(teamId: string | null) {
    setSelectedTeamId(null);
    onEditTeam?.(teamId);
  }

  function manageRoster(teamId: string) {
    setSelectedTeamId(null);
    onManageRoster?.(teamId);
  }

  function openReviewQueue() {
    setPage(1);
    setWarningFilter("open_review");
    setStatusFilter("all");
    setVerificationFilter("all");
    setMappingFilter("all");
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Canonical Team Registry</p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase">Registered Teams</h2>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            Review official teams, roster ownership, registration history, logos, and Discord identity mappings from one workspace.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {[
          ["Official teams", summary.total],
          ["Active", summary.active],
          ["Archived", summary.archived],
          ["Missing logo", summary.missingLogo],
          ["Missing IGL", summary.missingIgl],
          ["Missing manager", summary.missingManager],
          ["No Discord role", summary.missingDiscordMapping],
          ["Open reviews", summary.openReviews],
        ].map(([label, value]) => (
          <div key={String(label)} className="stat-pill p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">{label}</p>
            <p className="mt-1 font-mono-stat text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="esports-card space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="sr-only">Search teams</span>
            <input
              className="input-field w-full"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, tag, or slug"
            />
          </label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="disbanded">Disbanded</option>
            <option value="merged">Merged</option>
          </select>
          <select
            className="input-field"
            value={verificationFilter}
            onChange={(event) => {
              setVerificationFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Verification"
          >
            <option value="all">All verification</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="unverified">Unverified</option>
          </select>
          <select
            className="input-field"
            value={mappingFilter}
            onChange={(event) => {
              setMappingFilter(event.target.value as TeamMappingState | "all");
              setPage(1);
            }}
            aria-label="Discord mapping"
          >
            <option value="all">All Discord states</option>
            <option value="mapped">Mapped</option>
            <option value="unmapped">No role linked</option>
            <option value="pending_review">Pending review</option>
            <option value="role_missing">Role missing</option>
            <option value="conflict">Conflict</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            className="input-field"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            aria-label="Sort teams"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Team name</option>
            <option value="roster">Roster size</option>
            <option value="warnings">Most warnings</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate("discordRoles")} className="btn-secondary">
            Synchronize Discord
          </button>
          {onOpenLogoUpload ? (
            <button type="button" onClick={onOpenLogoUpload} className="btn-secondary">
              Bulk Upload Logos
            </button>
          ) : null}
          {canManageTeams ? (
            <button type="button" onClick={() => editTeam(null)} className="btn-primary">
              Add Team
            </button>
          ) : null}
          <button type="button" onClick={openReviewQueue} className="btn-secondary">
            Review Queue {summary.openReviews > 0 ? `(${summary.openReviews})` : ""}
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setVerificationFilter("all");
              setMappingFilter("all");
              setWarningFilter("all");
              setPage(1);
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
          <div className="ml-auto flex rounded-btn border border-white/10 p-1">
            {(["table", "cards"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase ${view === value ? "bg-accent-blue text-white" : "text-text-muted"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-red-500/30 bg-red-500/10 p-4 text-red-100"
        >
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="text-xs font-bold uppercase underline">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && visible.length === 0 ? (
        <div className="esports-card p-8 text-center">
          <h3 className="font-display text-lg font-black uppercase text-white">No teams match these filters</h3>
          <p className="mt-2 text-sm text-text-muted">Clear the filters or search for another team.</p>
        </div>
      ) : null}

      {view === "table" && visible.length > 0 ? (
        <div className="table-wrap hidden xl:block">
          <table aria-label="Registered teams" className="data-table min-w-[1320px]">
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">Status</th>
                <th scope="col">Verification</th>
                <th scope="col">Primary IGL</th>
                <th scope="col">Manager</th>
                <th scope="col">Roster</th>
                <th scope="col">Discord mapping</th>
                <th scope="col">Registrations</th>
                <th scope="col">Warnings</th>
                <th scope="col">Updated</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedVisible.map((team) => (
                <tr key={team.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <TeamLogo team={team} />
                      <div className="min-w-0">
                        <p className="max-w-48 truncate font-semibold text-white">{team.name}</p>
                        <p className="text-xs text-text-muted">{team.tag || "No tag"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="capitalize">{team.status}</td>
                  <td className="capitalize">{team.verification_status}</td>
                  <td>{team.primaryIgl?.display_name ?? team.primaryIgl?.email ?? "Missing"}</td>
                  <td>{team.managers[0]?.display_name ?? team.managers[0]?.email ?? "Missing"}</td>
                  <td>{team.rosterCount}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${mappingTone(team.mappingState)}`}
                    >
                      {mappingLabels[team.mappingState]}
                    </span>
                  </td>
                  <td>{team.registrationCount}</td>
                  <td>{team.warnings.length || "—"}</td>
                  <td>{formatDate(team.updated_at)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openTeamDetails(team.id)} className="btn-secondary !px-3 !py-2">
                        View
                      </button>
                      {canManageTeams ? (
                        <button type="button" onClick={() => editTeam(team.id)} className="btn-secondary !px-3 !py-2">
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {(view === "cards" || visible.length > 0) && (
        <div className={`${view === "table" ? "grid xl:hidden" : "grid"} gap-4 md:grid-cols-2 2xl:grid-cols-3`}>
          {pagedVisible.map((team) => (
            <article key={team.id} className="esports-card p-5">
              <div className="flex items-start gap-3">
                <TeamLogo team={team} size={52} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg font-black uppercase text-white">{team.name}</h3>
                  <p className="text-xs text-text-muted">{team.tag || "No tag"}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase">{team.status}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-text-muted">Primary IGL</dt>
                  <dd className="mt-1 truncate">{team.primaryIgl?.display_name ?? team.primaryIgl?.email ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Manager</dt>
                  <dd className="mt-1 truncate">{team.managers[0]?.display_name ?? team.managers[0]?.email ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Roster</dt>
                  <dd className="mt-1">{team.rosterCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Registrations</dt>
                  <dd className="mt-1">{team.registrationCount}</dd>
                </div>
              </dl>
              <span
                className={`mt-4 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${mappingTone(team.mappingState)}`}
              >
                {mappingLabels[team.mappingState]}
              </span>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => openTeamDetails(team.id)} className="btn-secondary !px-3 !py-2">
                  View
                </button>
                {canManageTeams ? (
                  <button type="button" onClick={() => editTeam(team.id)} className="btn-secondary !px-3 !py-2">
                    Edit
                  </button>
                ) : null}
                <button type="button" onClick={() => manageRoster(team.id)} className="btn-secondary !px-3 !py-2">
                  Roster
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {visible.length > pageSize ? (
        <nav aria-label="Registered teams pages" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)} of {visible.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <span className="rounded-btn border border-white/10 px-4 py-2 text-xs text-text-muted">
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}

      {loading ? (
        <div aria-live="polite" className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="esports-card h-36 animate-pulse bg-white/[0.03]" />
          ))}
        </div>
      ) : null}

      {selectedTeam ? (
        <div className="fixed inset-0 z-[110]">
          <button
            type="button"
            aria-label="Close team details"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedTeamId(null)}
          />
          <aside
            ref={detailDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-detail-title"
            className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-white/10 bg-bg-primary p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <TeamLogo team={selectedTeam} size={64} />
                <div className="min-w-0">
                  <p className="section-title">Official Team</p>
                  <h3 id="team-detail-title" className="mt-1 truncate font-display text-2xl font-black uppercase text-white">
                    {selectedTeam.name}
                  </h3>
                  <p className="text-sm text-text-muted">{selectedTeam.tag || "No tag"}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTeamId(null)} className="btn-secondary !px-3 !py-2">
                Close
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-text-muted">Status</dt>
                <dd className="mt-1 capitalize">{selectedTeam.status}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Verification</dt>
                <dd className="mt-1 capitalize">{selectedTeam.verification_status}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Primary IGL</dt>
                <dd className="mt-1">{selectedTeam.primaryIgl?.display_name ?? selectedTeam.primaryIgl?.email ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Manager</dt>
                <dd className="mt-1">{selectedTeam.managers[0]?.display_name ?? selectedTeam.managers[0]?.email ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Roster</dt>
                <dd className="mt-1">{selectedTeam.rosterCount}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Registrations</dt>
                <dd className="mt-1">{selectedTeam.registrationCount}</dd>
              </div>
            </dl>

            <section className="mt-6 rounded-card border border-white/10 p-4">
              <h4 className="font-display text-sm font-black uppercase text-white">Discord identity</h4>
              <p
                className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${mappingTone(selectedTeam.mappingState)}`}
              >
                {mappingLabels[selectedTeam.mappingState]}
              </p>
              {selectedTeam.discordMappings.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedTeam.discordMappings.map((mapping) => (
                    <div key={mapping.discord_role_id} className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs">
                      <p className="font-semibold text-white">{mapping.discord_role_name}</p>
                      <p className="mt-1 font-mono text-text-muted">{mapping.discord_role_id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-muted">No Discord role is linked to this team.</p>
              )}
            </section>

            {selectedTeam.warnings.length > 0 ? (
              <section className="mt-6">
                <h4 className="font-display text-sm font-black uppercase text-white">Attention needed</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTeam.warnings.map((warning) => (
                    <button
                      key={warning}
                      type="button"
                      onClick={() => {
                        setWarningFilter(warning);
                        setSelectedTeamId(null);
                      }}
                      className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase text-amber-100"
                    >
                      {warning.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {canManageTeams ? (
              <section className="mt-6 rounded-card border border-white/10 p-4">
                <h4 className="font-display text-sm font-black uppercase text-white">Team access</h4>
                {selectedTeam.memberCandidates.length > 0 ? (
                  <div className="mt-3 grid gap-3">
                    {(["team_igl", "team_manager"] as const).map((accessRole) => (
                      <div key={accessRole} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="text-xs font-semibold text-text-muted">
                          {accessRole === "team_igl" ? "Primary IGL profile" : "Manager profile"}
                          <select
                            className="input-esports mt-1 w-full"
                            value={accessDraft[accessRole]}
                            onChange={(event) =>
                              setAccessDraft((current) => ({
                                ...current,
                                [accessRole]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select a verified profile</option>
                            {selectedTeam.memberCandidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.display_name ?? candidate.email}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void assignTeamAccess(accessRole)}
                          disabled={savingAccessRole !== null || !accessDraft[accessRole]}
                          className="btn-secondary self-end disabled:opacity-50"
                        >
                          {savingAccessRole === accessRole ? "Assigning…" : accessRole === "team_igl" ? "Assign IGL" : "Assign Manager"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">
                    No active profile is linked to this team. Link a verified profile before assigning IGL or manager access.
                  </p>
                )}
                {detailMessage ? (
                  <p role="status" aria-live="polite" className="mt-3 text-xs text-text-muted">
                    {detailMessage}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="mt-6">
              <h4 className="font-display text-sm font-black uppercase text-white">Actions</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {canManageTeams ? (
                  <>
                    <button type="button" onClick={() => editTeam(selectedTeam.id)} className="btn-primary">
                      Edit Team
                    </button>
                    <button type="button" onClick={() => editTeam(selectedTeam.id)} className="btn-secondary">
                      Upload or Replace Logo
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={() => manageRoster(selectedTeam.id)} className="btn-secondary">
                  Manage Roster
                </button>
                <button type="button" onClick={() => navigate("discordRoles")} className="btn-secondary">
                  Map Discord Role
                </button>
                <button type="button" onClick={() => navigate("registrations")} className="btn-secondary">
                  View Registrations
                </button>
                <button type="button" onClick={() => navigate("settings")} className="btn-secondary">
                  View Audit Log
                </button>
                {selectedTeam.status === "active" && onArchiveTeam ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const archived = await onArchiveTeam(selectedTeam.id);
                      if (archived === false) return;
                      setSelectedTeamId(null);
                      await load();
                    }}
                    className="btn-secondary !border-red-500/40 !text-red-200"
                  >
                    Archive Team
                  </button>
                ) : null}
              </div>
              <p className="mt-4 text-xs text-text-muted">
                IGL and manager access is assigned from verified profiles in the team-access workflow. Discord roles are never inferred from
                a name alone.
              </p>
            </section>

            <p className="mt-6 text-xs text-text-muted">Last updated {formatDate(selectedTeam.updated_at)}</p>
          </aside>
        </div>
      ) : null}

      <div className="border-t border-white/10 pt-8">
        <AdminTeamReconciliationManager />
      </div>
    </section>
  );
}
