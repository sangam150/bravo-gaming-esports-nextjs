"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatDisplayDateTime } from "@/lib/display-format";
import type { AuthenticatedUserProfile, TeamWorkspaceData } from "@/lib/types";
import { MOSS_FILE_INPUT_ACCEPT } from "@/lib/upload-config";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";
import BravoLogo from "@/components/ui/BravoLogo";

type TeamUploadType = "team_logo" | "moss_file";

type RosterRequestFormState = {
  requestType: string;
  oldPlayerId: string;
  newPlayerName: string;
  newPlayerPubgName: string;
  notes: string;
};

type MossFormState = {
  eventId: string;
  matchId: string;
  playerId: string;
  externalLink: string;
};

const defaultRequestForm: RosterRequestFormState = {
  requestType: "add_player",
  oldPlayerId: "",
  newPlayerName: "",
  newPlayerPubgName: "",
  notes: "",
};

const defaultMossForm: MossFormState = {
  eventId: "",
  matchId: "",
  playerId: "",
  externalLink: "",
};

async function readJsonResponse<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      getResponseErrorMessage(response, data.error, {
        fallback: USER_FACING_ERROR_MESSAGES.teamWorkspace,
      })
    );
  }
  return data;
}

function hasTeamWorkspaceAccess(role?: string | null, isAdmin?: boolean) {
  return Boolean(isAdmin || role === "team_igl" || role === "team_manager");
}

export default function TeamPanelClient() {
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<AuthenticatedUserProfile | null>(null);
  const [workspace, setWorkspace] = useState<TeamWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<RosterRequestFormState>(defaultRequestForm);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [mossForm, setMossForm] = useState<MossFormState>(defaultMossForm);
  const [mossFile, setMossFile] = useState<File | null>(null);
  const [mossSubmitting, setMossSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [mossUploading, setMossUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => (configured ? getSupabaseBrowserClient() : null), [configured]);
  async function getAccessToken() {
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function authorizedFetch(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    return readJsonResponse<{ success?: boolean; data?: TeamWorkspaceData; user?: AuthenticatedUserProfile }>(response);
  }

  async function syncSession(session: Session | null) {
    if (!session?.access_token) {
      setProfile(null);
      setWorkspace(null);
      return null;
    }

    const sessionResponse = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.access_token }),
      credentials: "include",
    });
    await readJsonResponse<{ user?: AuthenticatedUserProfile }>(sessionResponse);

    const meResponse = await fetch("/api/auth/me", {
      credentials: "include",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const meData = await readJsonResponse<{ authenticated: boolean; user: AuthenticatedUserProfile }>(meResponse);
    setProfile(meData.user);
    return meData.user;
  }

  async function loadWorkspace() {
    setWorkspaceLoading(true);
    try {
      const response = await authorizedFetch("/api/team");
      setWorkspace(response.data ?? null);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function bootstrapSession() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nextProfile = await syncSession(session);

      if (nextProfile && hasTeamWorkspaceAccess(nextProfile.role, nextProfile.isAdmin)) {
        await loadWorkspace();
      } else if (nextProfile) {
        setWorkspace(null);
        setAuthError("This account is signed in, but it does not have team workspace access.");
      }
    } catch (error: unknown) {
      setAuthError(
        toUserFacingErrorMessage(error, {
          fallback: USER_FACING_ERROR_MESSAGES.teamWorkspace,
        })
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        setNotice(null);
        setAuthError(null);

        try {
          const nextProfile = await syncSession(session);
          if (nextProfile && hasTeamWorkspaceAccess(nextProfile.role, nextProfile.isAdmin)) {
            await loadWorkspace();
          } else if (!nextProfile) {
            setWorkspace(null);
          } else {
            setWorkspace(null);
            setAuthError("This account does not have access to the team workspace.");
          }
        } catch (error: unknown) {
          setAuthError(
            toUserFacingErrorMessage(error, {
              fallback: USER_FACING_ERROR_MESSAGES.teamWorkspace,
            })
          );
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setAuthLoading(true);
    setAuthError(null);
    setNotice(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const nextProfile = await syncSession(data.session);
      if (!nextProfile || !hasTeamWorkspaceAccess(nextProfile.role, nextProfile.isAdmin)) {
        await supabase.auth.signOut();
        throw new Error("This account does not have team workspace access.");
      }

      await loadWorkspace();
      setEmail("");
      setPassword("");
    } catch (error: unknown) {
      setAuthError(
        toUserFacingErrorMessage(error, {
          fallback: USER_FACING_ERROR_MESSAGES.login,
        })
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    setNotice(null);
    setAuthError(null);
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
    await supabase.auth.signOut();
    setProfile(null);
    setWorkspace(null);
  }

  async function uploadTeamFile(file: File, type: TeamUploadType, previousUrl?: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (previousUrl) {
      formData.append("previousUrl", previousUrl);
    }

    const token = await getAccessToken();
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch("/api/team/upload", {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });

    return readJsonResponse<{ success: true; url: string }>(response);
  }

  async function handleLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !workspace?.team) {
      return;
    }

    setLogoUploading(true);
    setAuthError(null);
    setNotice(null);

    try {
      const upload = await uploadTeamFile(file, "team_logo", workspace.team.logoUrl ?? undefined);
      await authorizedFetch("/api/team/requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "logo_update",
          payload: {
            logoUrl: upload.url,
            fileName: file.name,
          },
        }),
      });
      await loadWorkspace();
      setNotice("Logo update request submitted for admin approval.");
    } catch (error: unknown) {
      setAuthError(
        toUserFacingErrorMessage(error, {
          fallback: "We couldn't upload the team logo right now. Please try again shortly.",
        })
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestSubmitting(true);
    setAuthError(null);
    setNotice(null);

    try {
      await authorizedFetch("/api/team/requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: requestForm.requestType,
          oldPlayerId: requestForm.oldPlayerId || null,
          newPlayerName: requestForm.newPlayerName || null,
          newPlayerPubgName: requestForm.newPlayerPubgName || null,
          payload: {
            notes: requestForm.notes || null,
          },
        }),
      });
      setRequestForm(defaultRequestForm);
      await loadWorkspace();
      setNotice("Roster request submitted for admin review.");
    } catch (error: unknown) {
      setAuthError(
        toUserFacingErrorMessage(error, {
          fallback: "We couldn't submit that roster request right now. Please try again shortly.",
        })
      );
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function handleMossSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMossSubmitting(true);
    setAuthError(null);
    setNotice(null);

    try {
      let fileUrl: string | null = null;

      if (mossFile) {
        setMossUploading(true);
        const upload = await uploadTeamFile(mossFile, "moss_file");
        fileUrl = upload.url;
      }

      await authorizedFetch("/api/team/moss", {
        method: "POST",
        body: JSON.stringify({
          eventId: mossForm.eventId || null,
          matchId: mossForm.matchId || null,
          playerId: mossForm.playerId || null,
          externalLink: mossForm.externalLink || null,
          fileUrl,
        }),
      });

      setMossForm(defaultMossForm);
      setMossFile(null);
      await loadWorkspace();
      setNotice("MOSS submission sent to admins.");
    } catch (error: unknown) {
      setAuthError(
        toUserFacingErrorMessage(error, {
          fallback: "We couldn't submit that MOSS report right now. Please try again shortly.",
        })
      );
    } finally {
      setMossUploading(false);
      setMossSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="esports-card max-w-xl p-8 text-center">
          <div className="mx-auto w-fit">
            <BravoLogo size={64} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-black uppercase text-white">Team Workspace</h1>
          <p className="mt-3 text-sm text-text-muted">
            Team sign-in is temporarily unavailable until Supabase authentication is fully connected.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 text-sm text-text-muted">
        Preparing team workspace...
      </div>
    );
  }

  if (!profile || !hasTeamWorkspaceAccess(profile.role, profile.isAdmin)) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(0,163,255,0.18),transparent_50%),rgba(9,12,18,0.95)] p-8 shadow-2xl shadow-black/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-blue">Bravo Gaming Esports Nepal</p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase leading-none text-white sm:text-5xl">
            Team Workspace
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
            Manage roster requests, update team branding, review schedules, and track published match results from one
            team-first Bravo workspace. Tournament operations like MOSS stay available without dominating the panel.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Roster Requests", "Add, remove, and replace players without losing history."],
              ["Team Profile", "Upload logo updates and keep your public identity sharp."],
              ["Schedule & Results", "See your next published events and recent match outcomes."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-xs leading-6 text-text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleLogin} className="esports-card w-full max-w-xl self-center p-8">
          <div className="text-center">
            <div className="mx-auto w-fit">
              <BravoLogo size={56} />
            </div>
            <p className="section-title mt-4">Team Access</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Team Login</h2>
            <p className="mt-2 text-sm text-text-muted">
              Sign in with your Supabase team manager or team IGL account. Admins can also use this panel for testing.
            </p>
          </div>

          {authError && (
            <div className="mt-5 rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200">
              {authError}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <input
              className="input-esports"
              type="email"
              placeholder="Team email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <input
              className="input-esports"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="submit" disabled={authLoading} className="btn-primary w-full justify-center disabled:opacity-60">
            {authLoading ? "Checking access..." : "Open Team Workspace"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(0,163,255,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,106,0,0.16),transparent_35%),rgba(8,11,17,0.95)] p-6 shadow-2xl shadow-black/25">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-blue">Team Workspace</p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase text-white sm:text-4xl">
            {workspace?.team?.name ?? profile.displayName ?? profile.email}
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            {profile.displayName ?? profile.email} | Role: {profile.role}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Public changes stay pending until a Bravo admin approves them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading || !workspace?.team}
            className="btn-secondary disabled:opacity-60"
          >
            {logoUploading ? "Uploading Logo..." : "Upload Team Logo"}
          </button>
          <button type="button" onClick={handleLogout} className="btn-watch-live !text-[11px] !py-2">
            Sign Out
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
            className="hidden"
            onChange={(event) => void handleLogoSelected(event)}
          />
        </div>
      </div>

      {authError && (
        <div className="rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200">
          {authError}
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-green-200">
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="esports-card p-6">
          <div className="flex flex-wrap items-center gap-4">
            {workspace?.team?.logoUrl ? (
              <img
                src={workspace.team.logoUrl}
                alt={`${workspace.team.name} logo`}
                className="h-20 w-20 rounded-3xl border border-white/10 bg-black/20 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 text-xs uppercase tracking-[0.12em] text-text-muted">
                No Logo
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Tag</p>
                <p className="mt-1 text-sm font-semibold text-white">{workspace?.team?.tag ?? "TBD"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Slot</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {workspace?.team?.slotNumber ? `#${workspace.team.slotNumber}` : "Pending"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Region</p>
                <p className="mt-1 text-sm font-semibold text-white">{workspace?.team?.region ?? "Nepal"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Status</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {workspace?.team?.isActive === false ? "Inactive" : "Active"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-black uppercase text-white">Current Roster</h2>
              <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
                {workspace?.roster.length ?? 0} players
              </span>
            </div>
            {workspaceLoading ? (
              <p className="text-sm text-text-muted">Refreshing roster...</p>
            ) : workspace?.roster.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {workspace.roster.map((player) => (
                  <div key={player.id} className="rounded-3xl border border-white/10 bg-bg-primary/70 p-4">
                    <p className="font-semibold text-white">{player.pubgName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                      {player.isActive === false ? "Inactive" : "Active"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-3xl border border-white/10 bg-bg-primary/60 px-4 py-4 text-sm text-text-muted">
                Teams will appear after registration is approved.
              </p>
            )}
          </div>
        </section>

        <section className="esports-card p-6">
          <h2 className="font-display text-xl font-black uppercase text-white">Request Roster Changes</h2>
          <p className="mt-2 text-sm text-text-muted">
            Submit roster updates here. Admins review every change before it reaches public pages.
          </p>

          <form onSubmit={handleRequestSubmit} className="mt-5 space-y-4">
            <select
              className="input-esports"
              value={requestForm.requestType}
              onChange={(event) => setRequestForm((current) => ({ ...current, requestType: event.target.value }))}
            >
              <option value="add_player">Add New Player</option>
              <option value="remove_player">Remove Player</option>
              <option value="update_pubg_name">Update PUBG Name</option>
              <option value="roster_change">Replace Player</option>
            </select>

            <select
              className="input-esports"
              value={requestForm.oldPlayerId}
              onChange={(event) => setRequestForm((current) => ({ ...current, oldPlayerId: event.target.value }))}
            >
              <option value="">Select current player if applicable</option>
              {(workspace?.roster ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.pubgName}
                </option>
              ))}
            </select>

            <input
              className="input-esports"
              placeholder="New player name"
              value={requestForm.newPlayerName}
              onChange={(event) => setRequestForm((current) => ({ ...current, newPlayerName: event.target.value }))}
            />

            <input
              className="input-esports"
              placeholder="New PUBG name"
              value={requestForm.newPlayerPubgName}
              onChange={(event) => setRequestForm((current) => ({ ...current, newPlayerPubgName: event.target.value }))}
            />

            <textarea
              className="input-esports min-h-28"
              placeholder="Notes for admin review"
              value={requestForm.notes}
              onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
            />

            <button type="submit" disabled={requestSubmitting} className="btn-primary w-full justify-center disabled:opacity-60">
              {requestSubmitting ? "Submitting roster request..." : "Submit Request"}
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="esports-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-black uppercase text-white">Upcoming Schedule</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {(workspace?.upcomingEvents ?? []).length} event(s)
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {(workspace?.upcomingEvents ?? []).length === 0 ? (
              <p className="rounded-3xl border border-white/10 bg-bg-primary/60 px-4 py-4 text-sm text-text-muted">
                Teams will appear after registration is approved.
              </p>
            ) : (
              workspace?.upcomingEvents.map((event) => (
                <div key={event.id} className="rounded-3xl border border-white/10 bg-bg-primary/70 p-4">
                  <p className="font-semibold text-white">{event.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                    {event.type ?? "event"} | {event.status}
                  </p>
                  {(event.startDate || event.endDate) && (
                    <p className="mt-2 text-sm text-slate-300">
                      {event.startDate ?? "TBD"} {event.endDate ? `to ${event.endDate}` : ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="esports-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-black uppercase text-white">Recent Match Results</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {(workspace?.recentMatches ?? []).length} match(es)
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {(workspace?.recentMatches ?? []).length === 0 ? (
              <p className="rounded-3xl border border-white/10 bg-bg-primary/60 px-4 py-4 text-sm text-text-muted">
                Match data will appear once results are published.
              </p>
            ) : (
              workspace?.recentMatches.map((match) => (
                <div key={`${match.matchId}-priority`} className="rounded-3xl border border-white/10 bg-bg-primary/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {match.eventName ?? "Published Match"} {match.matchNumber ? `| Match ${match.matchNumber}` : ""}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                        {match.mapName ?? "Map Pending"} {match.startTime ? `| ${formatDisplayDateTime(match.startTime)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                      #{match.placement}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Kills</p>
                      <p className="mt-1 font-semibold text-white">{match.kills}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Points</p>
                      <p className="mt-1 font-semibold text-white">{match.totalPoints}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">WWCD</p>
                      <p className="mt-1 font-semibold text-white">{match.wwcd ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  {match.vodUrl ? (
                    <a href={match.vodUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-accent-blue hover:underline">
                      Open VOD
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="esports-card p-6">
          <h2 className="font-display text-xl font-black uppercase text-white">Tournament Operations</h2>
          <p className="mt-2 text-sm text-text-muted">
            Optional MOSS workflow for archives or external evidence linked to a specific event, match, or player.
          </p>

          <form onSubmit={handleMossSubmit} className="mt-5 space-y-4">
            <select
              className="input-esports"
              value={mossForm.eventId}
              onChange={(event) => setMossForm((current) => ({ ...current, eventId: event.target.value }))}
            >
              <option value="">Select event</option>
              {(workspace?.upcomingEvents ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            <input
              className="input-esports"
              placeholder="Match ID (optional)"
              value={mossForm.matchId}
              onChange={(event) => setMossForm((current) => ({ ...current, matchId: event.target.value }))}
            />

            <select
              className="input-esports"
              value={mossForm.playerId}
              onChange={(event) => setMossForm((current) => ({ ...current, playerId: event.target.value }))}
            >
              <option value="">Player (optional)</option>
              {(workspace?.roster ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.pubgName}
                </option>
              ))}
            </select>

            <input
              className="input-esports"
              placeholder="External MOSS link"
              value={mossForm.externalLink}
              onChange={(event) => setMossForm((current) => ({ ...current, externalLink: event.target.value }))}
            />

            <label className="block rounded-3xl border border-dashed border-white/15 bg-bg-primary/60 px-4 py-5 text-sm text-text-muted">
              <span className="block font-semibold text-white">MOSS file upload</span>
              <span className="mt-1 block text-xs">Supported: ZIP, RAR, 7Z, PDF, TXT</span>
              <input
                type="file"
                accept={MOSS_FILE_INPUT_ACCEPT}
                className="mt-3 block w-full text-xs text-text-muted"
                onChange={(event) => setMossFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <button type="submit" disabled={mossSubmitting} className="btn-primary w-full justify-center disabled:opacity-60">
              {mossSubmitting ? (mossUploading ? "Uploading evidence..." : "Submitting evidence...") : "Submit MOSS"}
            </button>
          </form>
        </section>

        <section className="esports-card p-6">
          <h2 className="font-display text-xl font-black uppercase text-white">Approval History</h2>
          <p className="mt-2 text-sm text-text-muted">Track every roster request and evidence submission in one place.</p>

          <div className="mt-5 space-y-3">
            {(workspace?.requests ?? []).length === 0 ? (
              <p className="rounded-3xl border border-white/10 bg-bg-primary/60 px-4 py-4 text-sm text-text-muted">
                No roster requests have been submitted yet.
              </p>
            ) : (
              workspace?.requests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-white/10 bg-bg-primary/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-white">{request.requestType.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-xs text-text-muted">{formatDisplayDateTime(request.createdAt)}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                      {request.status}
                    </span>
                  </div>
                  {request.newPlayerPubgName && (
                    <p className="mt-3 text-sm text-slate-300">Requested PUBG name: {request.newPlayerPubgName}</p>
                  )}
                  {request.adminNote && (
                    <p className="mt-2 text-sm text-slate-300">Admin note: {request.adminNote}</p>
                  )}
                </div>
              ))
            )}

            {(workspace?.mossSubmissions ?? []).length > 0 && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Recent MOSS Submissions</h3>
                <div className="mt-3 space-y-3">
                  {workspace?.mossSubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-3xl border border-white/10 bg-bg-primary/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-semibold text-white">
                          {submission.eventName ?? submission.matchId ?? "Submission"}
                        </p>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                          {submission.status}
                        </span>
                      </div>
                      {submission.fileUrl && (
                        <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-accent-blue hover:underline">
                          Open uploaded file
                        </a>
                      )}
                      {submission.externalLink && (
                        <a href={submission.externalLink} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-accent-blue hover:underline">
                          Open external link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
