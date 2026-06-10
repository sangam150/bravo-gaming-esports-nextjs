"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar, { type AdminSection } from "./AdminSidebar";
import BulkTeamLogoUpload from "./BulkTeamLogoUpload";
import FileUpload from "./FileUpload";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAdminAuth } from "./AuthProvider";
import { adminFetch } from "@/lib/admin-api";
import type {
  Announcement,
  Player,
  PlayerRole,
  PlayerStatus,
  RegistrationStatus,
  Scrim,
  ScrimStatus,
  Season,
  SeasonStatus,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMatch,
  TournamentStatus,
  ErrorLogRecord,
  UploadRecord,
} from "@/lib/types";

type DashboardStats = {
  totalTeams: number;
  totalPlayers: number;
  totalScrims: number;
  matchesPlayed: number;
  totalTournaments: number;
  pendingRegistrations: number;
  recentRegistrations: TeamRegistration[];
  recentUploads: UploadRecord[];
  firebaseConnected: boolean;
  totalSeasons?: number;
  activeSeasonTitle?: string;
  activeSeasonDay?: number;
  activeSeasonLength?: number;
};

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";
const btnDanger = "btn-watch-live !text-[11px] !py-1.5";
const ROLES: PlayerRole[] = ["IGL", "Assaulter", "Support", "Sniper", "Substitute"];
const defaultSeasonForm: Partial<Season> = {
  title: "BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS Season 1",
  slug: "bravo-gaming-esports-daily-pubg-pc-scrims-season-1",
  seriesTitle: "BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS",
  seasonNumber: 1,
  status: "active",
  startDate: "2026-06-05",
  configuredDays: 15,
  currentDay: 5,
  game: "PUBG PC",
  format: "Squad",
  region: "Global",
  perspective: "TPP",
};
const defaultScrimForm: Partial<Scrim> = {
  status: "scheduled",
  teamIds: [],
  mapRotation: [],
  lobbyTime: "8:00 PM NPT",
  pubgMatchIds: [],
};

function normalizeMatchIds(value?: string) {
  return Array.from(new Set((value ?? "").split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)));
}

function getScrimMatchIds(scrim?: Partial<Scrim>) {
  return Array.from(
    new Set([...(scrim?.pubgMatchIds ?? []), scrim?.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
  );
}

function formatScrimMatchIds(scrim?: Partial<Scrim>) {
  return getScrimMatchIds(scrim).join("\n");
}

export default function AdminDashboard() {
  const { user, logout } = useAdminAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [liveMatches, setLiveMatches] = useState<TournamentMatch[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tournamentForm, setTournamentForm] = useState<Partial<Tournament>>({
    status: "UPCOMING",
    maxTeams: 32,
    teamCount: 0,
    mapRotation: [],
    registeredTeamIds: [],
  });
  const [teamForm, setTeamForm] = useState<Partial<Team>>({
    totalPoints: 0,
    kills: 0,
    matches: 0,
    status: "active",
    registrationStatus: "approved",
  });
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({
    kills: 0,
    damage: 0,
    mvpCount: 0,
    chickenDinners: 0,
    matches: 0,
    playerStatus: "active",
  });
  const [scrimForm, setScrimForm] = useState<Partial<Scrim>>(defaultScrimForm);
  const [seasonForm, setSeasonForm] = useState<Partial<Season>>(defaultSeasonForm);
  const [announcementForm, setAnnouncementForm] = useState<Partial<Announcement>>({ published: true });
  const [editingSeason, setEditingSeason] = useState<string | null>(null);
  const [editingTournament, setEditingTournament] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingScrim, setEditingScrim] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [importTournamentId, setImportTournamentId] = useState("");
  const [importScrimId, setImportScrimId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importingBravoFeed, setImportingBravoFeed] = useState(false);
  const [syncingSeason, setSyncingSeason] = useState(false);
  const [pubgResult, setPubgResult] = useState<unknown>(null);

  const leaderboardRows = useMemo(
    () =>
      [...teams]
        .filter((t) => (t.matches ?? 0) > 0)
        .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
        .map((t, i) => ({ ...t, rank: i + 1 })),
    [teams]
  );

  const teamPlayers = useMemo(
    () => (selectedTeamId ? players.filter((p) => p.teamId === selectedTeamId) : []),
    [players, selectedTeamId]
  );
  const activeSeason = useMemo(
    () => seasons.find((season) => season.status === "active") ?? seasons[0] ?? null,
    [seasons]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, seasonsRes, tournamentsRes, teamsRes, playersRes, announcementsRes] = await Promise.all([
        adminFetch("/api/stats?admin=true"),
        fetch("/api/seasons").then((r) => r.json()),
        fetch("/api/tournaments").then((r) => r.json()),
        fetch("/api/teams").then((r) => r.json()),
        fetch("/api/players").then((r) => r.json()),
        fetch("/api/announcements").then((r) => r.json()),
      ]);
      setStats(statsRes.data);
      setSeasons(seasonsRes.data ?? []);
      setTournaments(tournamentsRes.data);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
      setAnnouncements(announcementsRes.data);

      try {
        const [regRes, scrimRes, matchRes, errorRes] = await Promise.all([
          adminFetch("/api/registrations"),
          adminFetch("/api/admin/scrims"),
          adminFetch("/api/admin/matches"),
          adminFetch("/api/admin/errors?limit=10"),
        ]);
        setRegistrations(regRes.data);
        setScrims(scrimRes.data);
        setLiveMatches(matchRes.data?.matches ?? []);
        setRecentUploads(matchRes.data?.uploads ?? []);
        setErrorLogs(errorRes.data ?? []);
      } catch {
        setRegistrations([]);
        setScrims([]);
        setLiveMatches([]);
        setErrorLogs([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeSeason) return;

    setTournamentForm((currentForm) =>
      currentForm.seasonId
        ? currentForm
        : {
            ...currentForm,
            seasonId: activeSeason.id,
            seasonTitle: activeSeason.seriesTitle ?? activeSeason.title,
            seasonNumber: activeSeason.seasonNumber,
          }
    );

    setScrimForm((currentForm) =>
      currentForm.seasonId
        ? currentForm
        : {
            ...currentForm,
            seasonId: activeSeason.id,
            seasonTitle: activeSeason.seriesTitle ?? activeSeason.title,
          }
    );
  }, [activeSeason]);

  async function handleSeasonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonForm.title) return;

    try {
      const payload = {
        ...seasonForm,
        configuredDays: Number(seasonForm.configuredDays ?? 15),
        currentDay: Number(seasonForm.currentDay ?? 0),
        seasonNumber: Number(seasonForm.seasonNumber ?? 1),
      };

      if (editingSeason) {
        await adminFetch(`/api/seasons/${editingSeason}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Season updated");
      } else {
        await adminFetch("/api/seasons", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Season created");
      }

      setSeasonForm(defaultSeasonForm);
      setEditingSeason(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSeasonStatusChange(season: Season, status: SeasonStatus) {
    try {
      await adminFetch(`/api/seasons/${season.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...season,
          title: season.title,
          status,
          endedEarly: status === "completed" ? season.currentDay! < season.configuredDays! : season.endedEarly,
          completedAt: status === "completed" ? new Date().toISOString() : season.completedAt,
          archivedAt: status === "archived" ? new Date().toISOString() : season.archivedAt,
        }),
      });
      setMessage(`Season marked as ${status}`);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSeasonSync(targetSeason?: Partial<Season>) {
    setSyncingSeason(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/seasons/sync-bravo-daily-scrims", {
        method: "POST",
        body: JSON.stringify({
          configuredDays: Number(targetSeason?.configuredDays ?? activeSeason?.configuredDays ?? seasonForm.configuredDays ?? 15),
          currentDay: Number(targetSeason?.currentDay ?? activeSeason?.currentDay ?? seasonForm.currentDay ?? 5),
        }),
      });

      setMessage(response.message ?? "Bravo season synced");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingSeason(false);
    }
  }

  async function handleTournamentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournamentForm.title) return;
    try {
      const selectedSeason =
        seasons.find((season) => season.id === tournamentForm.seasonId) ??
        activeSeason ??
        null;
      const payload = {
        ...tournamentForm,
        seasonId: tournamentForm.seasonId ?? selectedSeason?.id,
        seasonTitle: tournamentForm.seasonTitle ?? selectedSeason?.seriesTitle ?? selectedSeason?.title,
        seasonNumber: tournamentForm.seasonNumber ?? selectedSeason?.seasonNumber,
        teamCount: tournamentForm.registeredTeamIds?.length ?? tournamentForm.teamCount ?? 0,
        createdAt: tournamentForm.createdAt ?? new Date().toISOString(),
      };
      if (editingTournament) {
        await adminFetch(`/api/tournaments/${editingTournament}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Tournament updated");
      } else {
        await adminFetch("/api/tournaments", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Tournament created");
      }
      setTournamentForm({
        status: "UPCOMING",
        maxTeams: 32,
        teamCount: 0,
        mapRotation: [],
        registeredTeamIds: [],
        seasonId: activeSeason?.id,
        seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
        seasonNumber: activeSeason?.seasonNumber,
      });
      setEditingTournament(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamForm.name) return;
    try {
      const payload = {
        ...teamForm,
        logo: teamForm.logoUrl ?? teamForm.logo,
        createdAt: teamForm.createdAt ?? new Date().toISOString(),
      };
      if (editingTeam) {
        await adminFetch(`/api/teams/${editingTeam}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Team updated");
      } else {
        await adminFetch("/api/teams", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Team created");
      }
      setTeamForm({ totalPoints: 0, kills: 0, matches: 0, status: "active", registrationStatus: "approved" });
      setEditingTeam(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handlePlayerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerForm.name && !playerForm.inGameName) return;
    try {
      const payload = {
        ...playerForm,
        name: playerForm.name || playerForm.inGameName,
        avatar: playerForm.avatarUrl ?? playerForm.avatar,
      };
      if (editingPlayer) {
        await adminFetch(`/api/players/${editingPlayer}`, { method: "PUT", body: JSON.stringify(payload) });
        setMessage("Player updated");
      } else {
        await adminFetch("/api/players", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Player created");
      }
      setPlayerForm({ kills: 0, damage: 0, mvpCount: 0, chickenDinners: 0, matches: 0, playerStatus: "active" });
      setEditingPlayer(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleScrimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scrimForm.title || !scrimForm.date || !scrimForm.map) return;
    try {
      const selectedSeason =
        seasons.find((season) => season.id === scrimForm.seasonId) ??
        activeSeason ??
        null;
      const pubgMatchIds = getScrimMatchIds(scrimForm);
      const payload = {
        ...scrimForm,
        seasonId: scrimForm.seasonId ?? selectedSeason?.id,
        seasonTitle: scrimForm.seasonTitle ?? selectedSeason?.seriesTitle ?? selectedSeason?.title,
        pubgMatchId: pubgMatchIds[0],
        pubgMatchIds,
      };

      if (editingScrim) {
        await adminFetch("/api/admin/scrims", { method: "PUT", body: JSON.stringify({ ...payload, id: editingScrim }) });
        setMessage("Scrim updated");
      } else {
        await adminFetch("/api/admin/scrims", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Scrim created");
      }
      setScrimForm({
        ...defaultScrimForm,
        seasonId: activeSeason?.id,
        seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
      });
      setEditingScrim(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAnnouncementSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.detail) return;
    try {
      await adminFetch("/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          ...announcementForm,
          date: announcementForm.date ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
        }),
      });
      setMessage("Announcement published");
      setAnnouncementForm({ published: true });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function seedDatabase() {
    try {
      const res = await adminFetch("/api/admin/seed", { method: "POST" });
      setMessage(res.data.message);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleImportMatch() {
    const matchIds = normalizeMatchIds(matchId);
    if (matchIds.length === 0) {
      setError("PUBG Match ID is required");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const results: Array<{ matchId: string; success: boolean; data?: unknown; error?: string }> = [];

      for (const currentMatchId of matchIds) {
        try {
          const res = await adminFetch("/api/admin/matches/import", {
            method: "POST",
            body: JSON.stringify({
              matchId: currentMatchId,
              tournamentId: importTournamentId || undefined,
              scrimId: importScrimId || undefined,
              screenshotUrl: screenshotUrl || undefined,
            }),
          });
          results.push({ matchId: currentMatchId, success: true, data: res.data });
        } catch (err: unknown) {
          results.push({
            matchId: currentMatchId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const successfulImports = results.filter((result) => result.success);
      const failedImports = results.filter((result) => !result.success);

      setPubgResult(matchIds.length === 1 ? successfulImports[0]?.data ?? failedImports[0] : results);

      if (failedImports.length > 0) {
        setError(`Imported ${successfulImports.length}/${matchIds.length} PUBG match IDs. Check the result log below.`);
      } else {
        setMessage(
          matchIds.length === 1
            ? "Live match data imported from PUBG API"
            : `${successfulImports.length} PUBG match results imported from the API`
        );
      }

      setMatchId("");
      loadData();
    } finally {
      setImporting(false);
    }
  }

  async function handleImportBravoFeed() {
    setImportingBravoFeed(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/tournaments/import-bravo-feed", {
        method: "POST",
        body: JSON.stringify({
          configuredDays: Number(activeSeason?.configuredDays ?? seasonForm.configuredDays ?? 15),
          currentDay: Number(activeSeason?.currentDay ?? seasonForm.currentDay ?? 5),
        }),
      });
      setMessage(response.message ?? "Imported Bravo Gaming feed data.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportingBravoFeed(false);
    }
  }

  function toggleTournamentTeam(teamId: string) {
    const current = tournamentForm.registeredTeamIds ?? [];
    const next = current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId];
    setTournamentForm({ ...tournamentForm, registeredTeamIds: next, teamCount: next.length });
  }

  function toggleScrimTeam(teamId: string) {
    const current = scrimForm.teamIds ?? [];
    const next = current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId];
    setScrimForm({ ...scrimForm, teamIds: next });
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <AdminSidebar
        active={section}
        onChange={setSection}
        firebaseConnected={stats?.firebaseConnected ?? false}
        onLogout={() => void logout()}
        adminEmail={user?.email ?? undefined}
      />

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-title">Staff Control Center</p>
            <h1 className="font-display text-3xl font-black uppercase text-white">Admin Panel</h1>
          </div>
          <p className="text-xs text-text-muted">Live stats import from PUBG PC API only - no demo results.</p>
        </div>

        {(message || error) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-bravoRed/30 bg-bravoRed/10 text-red-300" : "border-bravoGreen/30 bg-bravoGreen/10 text-bravoGreen"}`}>
            {error ?? message}
            <button type="button" onClick={() => { setMessage(null); setError(null); }} className="ml-4 text-xs underline">Dismiss</button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading data...</p>}

        {section === "dashboard" && stats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Teams", value: stats.totalTeams },
                { label: "Total Players", value: stats.totalPlayers },
                { label: "Total Scrims", value: stats.totalScrims },
                { label: "Tournaments", value: stats.totalTournaments },
              ].map((s) => (
                <div key={s.label} className="stat-pill p-5">
                  <p className="text-label uppercase text-text-muted">{s.label}</p>
                  <p className="font-mono-stat mt-1 text-3xl font-extrabold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {activeSeason && (
              <div className="esports-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="section-heading !text-sm">Active Season</p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      {activeSeason.seriesTitle ?? activeSeason.title}
                    </h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Started {activeSeason.startDate} | Day {activeSeason.currentDay} of {activeSeason.configuredDays}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                      <p className="text-label uppercase text-text-muted">Status</p>
                      <p className="mt-2 font-mono-stat text-white">{activeSeason.status}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                      <p className="text-label uppercase text-text-muted">Length</p>
                      <p className="mt-2 font-mono-stat text-accent-blue">{activeSeason.configuredDays} Days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <p className="section-heading !text-sm">Recent Live Matches</p>
              </div>
              {liveMatches.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">Waiting for live match data</p>
              ) : (
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead><tr><th>Map</th><th>Winner</th><th>KOs</th><th>Synced</th><th>Source</th></tr></thead>
                    <tbody>
                      {liveMatches.slice(0, 8).map((m) => (
                        <tr key={m.id}>
                          <td className="text-accent-blue">{m.map}</td>
                          <td className="font-semibold">{m.winner}</td>
                          <td>{m.knockouts}</td>
                          <td className="text-text-muted">{m.syncedAt ? new Date(m.syncedAt).toLocaleString() : "-"}</td>
                          <td className="text-accent-green">{m.dataSource}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Recent Registrations</p>
                {stats.recentRegistrations?.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {stats.recentRegistrations.map((r) => (
                      <li key={r.id} className="flex justify-between border-b border-white/5 py-2">
                        <span className="text-white">{r.teamName}</span>
                        <span className="text-text-muted">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">No registrations yet</p>
                )}
              </div>
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Recent Uploads</p>
                {(stats.recentUploads?.length || recentUploads.length) ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {(stats.recentUploads ?? recentUploads).map((u) => (
                      <li key={u.id} className="flex justify-between border-b border-white/5 py-2">
                        <span className="text-white">{u.type.replace(/_/g, " ")}</span>
                        <span className="text-text-muted">{new Date(u.uploadedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">No uploads yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {section === "seasons" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {editingSeason ? "Edit Season" : "Season Manager"}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configure the active Bravo daily scrim season, extend it, or rebuild stored day data from the imported feed.
                </p>
              </div>
              <button type="button" onClick={() => void handleSeasonSync(activeSeason ?? seasonForm)} disabled={syncingSeason} className={btnPrimary}>
                {syncingSeason ? "Syncing Season..." : "Sync Bravo Daily Scrims"}
              </button>
            </div>

            <form onSubmit={handleSeasonSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Season title"
                value={seasonForm.title ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title: e.target.value })}
                required
              />
              <input
                className={inputClass}
                placeholder="Series title"
                value={seasonForm.seriesTitle ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, seriesTitle: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min={1}
                placeholder="Season number"
                value={seasonForm.seasonNumber ?? 1}
                onChange={(e) => setSeasonForm({ ...seasonForm, seasonNumber: Number(e.target.value) })}
              />
              <select
                className={inputClass}
                value={seasonForm.status ?? "active"}
                onChange={(e) => setSeasonForm({ ...seasonForm, status: e.target.value as SeasonStatus })}
              >
                {(["active", "planned", "completed", "archived"] as const).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                type="date"
                value={seasonForm.startDate ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
              />
              <select
                className={inputClass}
                value={Number(seasonForm.configuredDays ?? 15)}
                onChange={(e) => setSeasonForm({ ...seasonForm, configuredDays: Number(e.target.value) })}
              >
                <option value={15}>15 Days</option>
                <option value={30}>30 Days</option>
              </select>
              <input
                className={inputClass}
                type="number"
                min={0}
                placeholder="Current day"
                value={seasonForm.currentDay ?? 0}
                onChange={(e) => setSeasonForm({ ...seasonForm, currentDay: Number(e.target.value) })}
              />
              <input
                className={inputClass}
                placeholder="Current tournament ID"
                value={seasonForm.currentTournamentId ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, currentTournamentId: e.target.value })}
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                placeholder="Notes"
                rows={3}
                value={seasonForm.notes ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, notes: e.target.value })}
              />
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>
                  {editingSeason ? "Update" : "Create"} Season
                </button>
                {editingSeason && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSeason(null);
                      setSeasonForm(defaultSeasonForm);
                    }}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="grid gap-4 xl:grid-cols-3">
              {seasons.length === 0 ? (
                <div className="esports-card p-6 text-sm text-text-muted xl:col-span-3">
                  No seasons saved yet. Use the sync button to create the active Bravo season in Firestore.
                </div>
              ) : (
                seasons.map((season) => (
                  <div key={season.id} className="esports-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-label uppercase text-accent-blue">Season {season.seasonNumber}</p>
                        <h3 className="mt-2 break-words font-display text-sm font-bold uppercase text-white">
                          {season.seriesTitle ?? season.title}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase text-text-muted">
                        {season.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-label uppercase text-text-muted">Start</p>
                        <p className="font-mono-stat text-white">{season.startDate}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Length</p>
                        <p className="font-mono-stat text-white">{season.configuredDays} Days</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Current Day</p>
                        <p className="font-mono-stat text-accent-blue">Day {season.currentDay}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Tournaments</p>
                        <p className="font-mono-stat text-white">{season.tournamentIds?.length ?? 0}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs">
                      <button type="button" onClick={() => { setEditingSeason(season.id); setSeasonForm(season); setSection("seasons"); }} className="text-bravoBlue hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleSeasonSync(season)} className="text-accent-green hover:underline">
                        Rebuild
                      </button>
                      {season.status !== "completed" && (
                        <button type="button" onClick={() => void handleSeasonStatusChange(season, "completed")} className="text-amber-300 hover:underline">
                          End Season
                        </button>
                      )}
                      {season.status !== "archived" && (
                        <button type="button" onClick={() => void handleSeasonStatusChange(season, "archived")} className="text-text-muted hover:underline">
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {section === "tournaments" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-white">{editingTournament ? "Edit Tournament" : "Create Tournament"}</h2>
              <button type="button" onClick={handleImportBravoFeed} disabled={importingBravoFeed} className={btnPrimary}>
                {importingBravoFeed ? "Importing Feed..." : "Import Bravo Gaming Feed Data"}
              </button>
            </div>
            <form onSubmit={handleTournamentSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input className={inputClass} placeholder="Title" value={tournamentForm.title ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, title: e.target.value })} required />
              <input className={inputClass} placeholder="Tier" value={tournamentForm.tier ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, tier: e.target.value })} />
              <select className={inputClass} value={tournamentForm.status ?? "UPCOMING"} onChange={(e) => setTournamentForm({ ...tournamentForm, status: e.target.value as TournamentStatus })}>
                {(["LIVE", "OPEN", "REGISTERING", "UPCOMING", "COMPLETED"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className={inputClass}
                value={tournamentForm.seasonId ?? activeSeason?.id ?? ""}
                onChange={(e) => {
                  const season = seasons.find((item) => item.id === e.target.value);
                  setTournamentForm({
                    ...tournamentForm,
                    seasonId: e.target.value || undefined,
                    seasonTitle: season?.seriesTitle ?? season?.title,
                    seasonNumber: season?.seasonNumber,
                  });
                }}
              >
                <option value="">No season</option>
                {seasons.map((season) => <option key={season.id} value={season.id}>{season.seriesTitle ?? season.title}</option>)}
              </select>
              <input className={inputClass} placeholder="Prize Pool" value={tournamentForm.prizePool ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, prizePool: e.target.value })} />
              <input className={inputClass} type="number" placeholder="Max Teams" value={tournamentForm.maxTeams ?? 32} onChange={(e) => setTournamentForm({ ...tournamentForm, maxTeams: Number(e.target.value) })} />
              <input className={inputClass} type="date" value={tournamentForm.startDate ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, startDate: e.target.value })} />
              <input className={inputClass} type="number" min={1} placeholder="Season Day Number" value={tournamentForm.seasonDayNumber ?? tournamentForm.dayNumber ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, seasonDayNumber: e.target.value ? Number(e.target.value) : undefined, dayNumber: e.target.value ? Number(e.target.value) : undefined })} />
              <input className={`${inputClass} sm:col-span-2`} placeholder="Map rotation (comma separated)" value={(tournamentForm.mapRotation ?? []).join(", ")} onChange={(e) => setTournamentForm({ ...tournamentForm, mapRotation: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <textarea className={`${inputClass} sm:col-span-2`} placeholder="Rules" rows={3} value={tournamentForm.rules ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, rules: e.target.value })} />
              <textarea className={`${inputClass} sm:col-span-2`} placeholder="Schedule" rows={2} value={tournamentForm.schedule ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, schedule: e.target.value })} />
              <textarea className={`${inputClass} sm:col-span-2`} placeholder="Description" rows={2} value={tournamentForm.description ?? ""} onChange={(e) => setTournamentForm({ ...tournamentForm, description: e.target.value })} />
              <div className="sm:col-span-2">
                <FileUpload type="tournament_banner" entityId={editingTournament ?? tournamentForm.title ?? "new"} label="Tournament Banner" currentUrl={tournamentForm.bannerUrl} onUploaded={(url) => setTournamentForm({ ...tournamentForm, bannerUrl: url })} />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Registered Teams</p>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <button key={t.id} type="button" onClick={() => toggleTournamentTeam(t.id)} className={`rounded-full px-3 py-1 text-xs ${(tournamentForm.registeredTeamIds ?? []).includes(t.id) ? "bg-accent-blue text-white" : "border border-white/10 text-text-muted"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>{editingTournament ? "Update" : "Create"} Tournament</button>
                {editingTournament && <button type="button" onClick={() => { setEditingTournament(null); setTournamentForm({ status: "UPCOMING", maxTeams: 32, teamCount: 0, mapRotation: [], registeredTeamIds: [], seasonId: activeSeason?.id, seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title, seasonNumber: activeSeason?.seasonNumber }); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button>}
              </div>
            </form>
            <div className="esports-card overflow-hidden">
              <div className="table-scroll">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-slate-950/80 text-slate-400">
                    <tr><th className="px-4 py-3">Tournament</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Teams</th><th className="px-4 py-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-slate-300">{t.teamCount}/{t.maxTeams}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={() => { setEditingTournament(t.id); setTournamentForm(t); }} className="text-bravoBlue hover:underline">Edit</button>
                            <button type="button" onClick={async () => { await adminFetch(`/api/tournaments/${t.id}`, { method: "DELETE" }); loadData(); }} className="text-bravoRed hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {section === "teams" && (
          <div className="space-y-6">
            <BulkTeamLogoUpload teams={teams} onComplete={loadData} />
            <h2 className="text-2xl font-black text-white">{editingTeam ? "Edit Team" : "Add Team"}</h2>
            <form onSubmit={handleTeamSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input className={inputClass} placeholder="Team Name" value={teamForm.name ?? ""} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} required />
              <input className={inputClass} placeholder="Tag" value={teamForm.tag ?? ""} onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value })} />
              <input className={inputClass} placeholder="Country" value={teamForm.country ?? ""} onChange={(e) => setTeamForm({ ...teamForm, country: e.target.value })} />
              <input className={inputClass} placeholder="Captain Name" value={teamForm.captainName ?? ""} onChange={(e) => setTeamForm({ ...teamForm, captainName: e.target.value })} />
              <input className={inputClass} placeholder="Captain Discord" value={teamForm.captainDiscord ?? ""} onChange={(e) => setTeamForm({ ...teamForm, captainDiscord: e.target.value })} />
              <input className={inputClass} placeholder="Captain Phone" value={teamForm.captainPhone ?? ""} onChange={(e) => setTeamForm({ ...teamForm, captainPhone: e.target.value })} />
              <input className={inputClass} placeholder="Captain Email" value={teamForm.captainEmail ?? ""} onChange={(e) => setTeamForm({ ...teamForm, captainEmail: e.target.value })} />
              <input className={inputClass} type="number" placeholder="Slot Number" value={teamForm.slotNumber ?? ""} onChange={(e) => setTeamForm({ ...teamForm, slotNumber: e.target.value ? Number(e.target.value) : undefined })} />
              <select className={inputClass} value={teamForm.registrationStatus ?? "approved"} onChange={(e) => setTeamForm({ ...teamForm, registrationStatus: e.target.value as RegistrationStatus })}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className="sm:col-span-2">
                <FileUpload type="team_logo" entityId={editingTeam ?? teamForm.name ?? "new"} label="Team Logo" currentUrl={teamForm.logoUrl ?? teamForm.logo} onUploaded={(url) => setTeamForm({ ...teamForm, logoUrl: url })} />
              </div>
              <p className="sm:col-span-2 text-xs text-text-muted">Match stats (points, kills) update automatically from live PUBG imports. Manual edits are for corrections only.</p>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>{editingTeam ? "Update" : "Create"} Team</button>
                {editingTeam && <button type="button" onClick={() => { setEditingTeam(null); setTeamForm({ totalPoints: 0, kills: 0, matches: 0, status: "active", registrationStatus: "approved" }); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button>}
              </div>
            </form>
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <div key={team.id} className="esports-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {team.logoUrl || team.logo ? (
                        <img src={team.logoUrl ?? team.logo} alt={team.name} loading="lazy" decoding="async" className="h-14 w-14 rounded-xl border border-white/10 object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 text-[10px] uppercase text-text-muted">
                          No Logo
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {team.name} {team.tag && <span className="text-accent-blue">[{team.tag}]</span>}
                        </p>
                        <p className="text-sm text-slate-400">{team.country ?? "—"} · Captain: {team.captainName ?? "—"}</p>
                        <p className="mt-1 text-xs text-text-muted">Slot #{team.slotNumber ?? "—"} · Rank #{team.rank ?? "—"} · {team.totalPoints ?? 0} pts · {team.matches ?? 0} matches</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setEditingTeam(team.id); setTeamForm(team); setSelectedTeamId(team.id); setSection("players"); }} className="text-bravoBlue text-sm hover:underline">Players</button>
                      <button type="button" onClick={() => { setEditingTeam(team.id); setTeamForm(team); }} className="text-bravoBlue text-sm hover:underline">Edit</button>
                      <button type="button" onClick={async () => { await adminFetch(`/api/teams/${team.id}`, { method: "DELETE" }); loadData(); }} className="text-bravoRed text-sm hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "players" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">{editingPlayer ? "Edit Player" : "Add Player"}</h2>
            {selectedTeamId && (
              <p className="text-sm text-accent-blue">Managing players for: {teams.find((t) => t.id === selectedTeamId)?.name}</p>
            )}
            <form onSubmit={handlePlayerSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input className={inputClass} placeholder="Real Name" value={playerForm.realName ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, realName: e.target.value })} />
              <input className={inputClass} placeholder="In-Game Name" value={playerForm.inGameName ?? playerForm.name ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, inGameName: e.target.value, name: e.target.value })} required />
              <input className={inputClass} placeholder="PUBG ID" value={playerForm.pubgId ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, pubgId: e.target.value })} />
              <select className={inputClass} value={playerForm.role ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value as PlayerRole })}>
                <option value="">Role</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className={inputClass} value={playerForm.teamId ?? selectedTeamId ?? ""} onChange={(e) => { const team = teams.find((t) => t.id === e.target.value); setPlayerForm({ ...playerForm, teamId: e.target.value, teamName: team?.name }); }}>
                <option value="">Select Team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className={inputClass} value={playerForm.playerStatus ?? "active"} onChange={(e) => setPlayerForm({ ...playerForm, playerStatus: e.target.value as PlayerStatus })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <input className={inputClass} placeholder="Discord" value={playerForm.discord ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, discord: e.target.value })} />
              <input className={inputClass} placeholder="Phone / Email" value={playerForm.phone ?? playerForm.email ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value, email: e.target.value })} />
              <input className={inputClass} placeholder="Nationality" value={playerForm.nationality ?? ""} onChange={(e) => setPlayerForm({ ...playerForm, nationality: e.target.value })} />
              <div className="sm:col-span-2">
                <FileUpload type="player_avatar" entityId={editingPlayer ?? playerForm.inGameName ?? "new"} label="Profile Picture" currentUrl={playerForm.avatarUrl ?? playerForm.avatar} onUploaded={(url) => setPlayerForm({ ...playerForm, avatarUrl: url })} />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>{editingPlayer ? "Update" : "Create"} Player</button>
                {editingPlayer && <button type="button" onClick={() => { setEditingPlayer(null); setPlayerForm({ kills: 0, damage: 0, mvpCount: 0, chickenDinners: 0, matches: 0, playerStatus: "active" }); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button>}
              </div>
            </form>
            <div className="esports-card overflow-hidden">
              <div className="table-scroll">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-slate-400"><tr><th className="px-4 py-3">Player</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Kills</th><th className="px-4 py-3">Actions</th></tr></thead>
                  <tbody>
                    {(selectedTeamId ? teamPlayers : players).map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{p.inGameName ?? p.name}</td>
                        <td className="px-4 py-3 text-slate-300">{p.teamName ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{p.role ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{p.kills}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={() => { setEditingPlayer(p.id); setPlayerForm(p); }} className="text-bravoBlue hover:underline">Edit</button>
                            <button type="button" onClick={async () => { await adminFetch(`/api/players/${p.id}`, { method: "DELETE" }); loadData(); }} className="text-bravoRed hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === "scrims" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">{editingScrim ? "Edit Scrim" : "Create Daily Scrim"}</h2>
            <form onSubmit={handleScrimSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input className={inputClass} placeholder="Title" value={scrimForm.title ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, title: e.target.value })} required />
              <input className={inputClass} type="date" value={scrimForm.date ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, date: e.target.value })} required />
              <select
                className={inputClass}
                value={scrimForm.seasonId ?? activeSeason?.id ?? ""}
                onChange={(e) => {
                  const season = seasons.find((item) => item.id === e.target.value);
                  setScrimForm({
                    ...scrimForm,
                    seasonId: e.target.value || undefined,
                    seasonTitle: season?.seriesTitle ?? season?.title,
                  });
                }}
              >
                <option value="">No season</option>
                {seasons.map((season) => <option key={season.id} value={season.id}>{season.seriesTitle ?? season.title}</option>)}
              </select>
              <input className={inputClass} placeholder="Map" value={scrimForm.map ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, map: e.target.value })} required />
              <input className={inputClass} placeholder="Lobby Time" value={scrimForm.lobbyTime ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, lobbyTime: e.target.value })} />
              <input className={inputClass} placeholder="Room ID" value={scrimForm.roomId ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, roomId: e.target.value })} />
              <input className={inputClass} placeholder="Room Password" value={scrimForm.roomPassword ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, roomPassword: e.target.value })} />
              <input className={inputClass} type="number" min={1} placeholder="Season Day Number" value={scrimForm.seasonDayNumber ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, seasonDayNumber: e.target.value ? Number(e.target.value) : undefined })} />
              <select className={inputClass} value={scrimForm.status ?? "scheduled"} onChange={(e) => setScrimForm({ ...scrimForm, status: e.target.value as ScrimStatus })}>
                {(["scheduled", "live", "completed", "waiting_for_data"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className={inputClass} value={scrimForm.tournamentId ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, tournamentId: e.target.value || undefined })}>
                <option value="">Linked tournament (optional)</option>
                {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title}</option>)}
              </select>
              <textarea
                className={`${inputClass} sm:col-span-2`}
                placeholder="PUBG Match IDs (one per line or comma separated)"
                rows={3}
                value={formatScrimMatchIds(scrimForm)}
                onChange={(e) => {
                  const pubgMatchIds = normalizeMatchIds(e.target.value);
                  setScrimForm({ ...scrimForm, pubgMatchIds, pubgMatchId: pubgMatchIds[0] });
                }}
              />
              <input className={`${inputClass} sm:col-span-2`} placeholder="Map rotation (comma separated)" value={(scrimForm.mapRotation ?? []).join(", ")} onChange={(e) => setScrimForm({ ...scrimForm, mapRotation: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <textarea className={`${inputClass} sm:col-span-2`} placeholder="Announcement" rows={2} value={scrimForm.announcement ?? ""} onChange={(e) => setScrimForm({ ...scrimForm, announcement: e.target.value })} />
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Assigned Teams</p>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <button key={t.id} type="button" onClick={() => toggleScrimTeam(t.id)} className={`rounded-full px-3 py-1 text-xs ${(scrimForm.teamIds ?? []).includes(t.id) ? "bg-accent-green text-black" : "border border-white/10 text-text-muted"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>{editingScrim ? "Update" : "Create"} Scrim</button>
                {editingScrim && <button type="button" onClick={() => { setEditingScrim(null); setScrimForm({ ...defaultScrimForm, seasonId: activeSeason?.id, seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title }); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button>}
              </div>
            </form>
            <div className="space-y-3">
              {scrims.map((s) => (
                <div key={s.id} className="esports-card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="text-sm text-text-muted">{s.date} - {s.map} - {s.lobbyTime}</p>
                    <p className="text-xs text-text-muted">Room: {s.roomId ?? "-"} - Match IDs: {getScrimMatchIds(s).join(", ") || "-"}</p>
                    <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-accent-blue">{s.status}</span>
                  </div>
                  <div className="flex gap-2">
                    {getScrimMatchIds(s).length > 0 && (
                      <button type="button" onClick={async () => { setMatchId(formatScrimMatchIds(s)); setImportScrimId(s.id); setSection("pubg"); }} className="btn-secondary !text-[11px]">Import Data</button>
                    )}
                    <button type="button" onClick={() => { setEditingScrim(s.id); setScrimForm({ ...s, pubgMatchIds: getScrimMatchIds(s), pubgMatchId: getScrimMatchIds(s)[0] }); }} className="text-bravoBlue text-sm hover:underline">Edit</button>
                    <button type="button" onClick={async () => { await adminFetch(`/api/admin/scrims?id=${s.id}`, { method: "DELETE" }); loadData(); }} className="text-bravoRed text-sm hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "matches" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Live Match Results</h2>
            {liveMatches.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">Waiting for live match data. Import a PUBG match ID to populate results.</div>
            ) : (
              <div className="esports-card overflow-hidden">
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead><tr><th>Match ID</th><th>Map</th><th>Winner</th><th>Points</th><th>KOs</th><th>Synced</th></tr></thead>
                    <tbody>
                      {liveMatches.map((m) => (
                        <tr key={m.id}>
                          <td className="font-mono text-xs">{m.pubgMatchId}</td>
                          <td>{m.map}</td>
                          <td className="font-semibold">{m.winner}</td>
                          <td className="points-cell">{m.points}</td>
                          <td>{m.knockouts}</td>
                          <td className="text-text-muted">{m.syncedAt ? new Date(m.syncedAt).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "leaderboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Points Table</h2>
            <p className="text-sm text-text-muted">Rankings auto-update when live PUBG match data is imported.</p>
            {leaderboardRows.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">Waiting for live match data</div>
            ) : (
              <div className="esports-card overflow-hidden">
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead><tr><th>#</th><th>Team</th><th>M</th><th>K</th><th>Place Pts</th><th>Total</th></tr></thead>
                    <tbody>
                      {leaderboardRows.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono-stat text-accent-blue">#{t.rank}</td>
                          <td className="font-semibold">{t.name}</td>
                          <td>{t.matches}</td>
                          <td>{t.kills}</td>
                          <td>{t.placementPoints ?? 0}</td>
                          <td className="points-cell">{t.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "registrations" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Team Registrations</h2>
            {registrations.length === 0 ? (
              <div className="esports-card p-8 text-center text-slate-400">No registrations yet.</div>
            ) : (
              <div className="space-y-4">
                {registrations.map((r) => (
                  <div key={r.id} className="esports-card flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-white">{r.teamName}</p>
                      <p className="text-sm text-slate-400">Captain: {r.captainName}</p>
                      <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs uppercase ${r.status === "pending" ? "bg-amber-500/20 text-amber-300" : r.status === "approved" ? "bg-bravoGreen/20 text-bravoGreen" : "bg-bravoRed/20 text-bravoRed"}`}>{r.status}</span>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button type="button" onClick={async () => { await adminFetch("/api/registrations", { method: "PATCH", body: JSON.stringify({ id: r.id, status: "approved" }) }); loadData(); }} className={btnPrimary}>Approve</button>
                        <button type="button" onClick={async () => { await adminFetch("/api/registrations", { method: "PATCH", body: JSON.stringify({ id: r.id, status: "rejected" }) }); loadData(); }} className={btnDanger}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "announcements" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Announcements</h2>
            <form onSubmit={handleAnnouncementSubmit} className="esports-card grid gap-4 p-6">
              <input className={inputClass} placeholder="Title" value={announcementForm.title ?? ""} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required />
              <textarea className={inputClass} placeholder="Detail" rows={3} value={announcementForm.detail ?? ""} onChange={(e) => setAnnouncementForm({ ...announcementForm, detail: e.target.value })} required />
              <button type="submit" className={`${btnPrimary} w-fit`}>Publish</button>
            </form>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="esports-card flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold text-white">{a.title}</p>
                    <p className="text-sm text-slate-400">{a.date}</p>
                  </div>
                  <button type="button" onClick={async () => { await adminFetch(`/api/announcements?id=${a.id}`, { method: "DELETE" }); loadData(); }} className={btnDanger}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "pubg" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Import Live Match Data</h2>
            <p className="text-sm text-text-muted">All points, kills, and rankings are imported from the real PUBG PC API. No random or demo data is generated.</p>
            <div className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <textarea className={`${inputClass} sm:col-span-2`} placeholder="PUBG Match IDs (one per line or comma separated)" rows={4} value={matchId} onChange={(e) => setMatchId(e.target.value)} />
              <select className={inputClass} value={importTournamentId} onChange={(e) => setImportTournamentId(e.target.value)}>
                <option value="">Link to tournament (optional)</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <select className={inputClass} value={importScrimId} onChange={(e) => {
                const nextScrimId = e.target.value;
                setImportScrimId(nextScrimId);
                const selectedScrim = scrims.find((scrim) => scrim.id === nextScrimId);
                if (selectedScrim) {
                  setMatchId(formatScrimMatchIds(selectedScrim));
                }
              }}>
                <option value="">Link to scrim (optional)</option>
                {scrims.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <FileUpload type="match_screenshot" entityId={normalizeMatchIds(matchId)[0] || "match"} label="Result Screenshot" currentUrl={screenshotUrl} onUploaded={setScreenshotUrl} />
              <div className="sm:col-span-2 flex gap-3">
                <button type="button" onClick={handleImportMatch} disabled={importing} className={btnPrimary}>
                  {importing ? "Importing..." : "Import Match Data"}
                </button>
              </div>
            </div>
            {pubgResult && (
              <pre className="esports-card max-h-80 overflow-auto p-4 text-xs text-slate-300">{JSON.stringify(pubgResult, null, 2)}</pre>
            )}
          </div>
        )}

        {section === "settings" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Settings</h2>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Firebase Status</p>
              <p className="text-sm text-slate-400">
                {stats?.firebaseConnected ? "Connected - Firestore and Storage active" : "Not configured - add FIREBASE_* and NEXT_PUBLIC_FIREBASE_* env vars"}
              </p>
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Recent Error Logs</p>
              {errorLogs.length === 0 ? (
                <p className="text-sm text-slate-400">No recent server errors logged.</p>
              ) : (
                <div className="space-y-3">
                  {errorLogs.map((log) => (
                    <div key={log.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{log.scope}</p>
                        <p className="text-xs text-text-muted">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{log.message}</p>
                      {log.pathname && (
                        <p className="mt-1 text-xs text-text-muted">
                          {log.method ?? "REQUEST"} {log.pathname}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Seed Database</p>
              <p className="text-sm text-slate-400">Seeds teams, players, tournaments. Does not seed fake match results.</p>
              <button type="button" onClick={seedDatabase} className={btnPrimary}>Seed Database</button>
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Auto-Sync Cron</p>
              <p className="text-sm text-slate-400">Configure Vercel Cron to GET /api/cron/sync-matches with Authorization: Bearer CRON_SECRET</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


