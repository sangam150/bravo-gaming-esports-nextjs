"use client";

import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { useCallback, useEffect, useMemo, useState } from "react";

type DiscordLinkProfile = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  teamId: string | null;
  teamName: string | null;
  discordUserId: string | null;
};

type DiscordLinksPayload = {
  profiles: DiscordLinkProfile[];
};

export default function AdminDiscordLinkManager() {
  const [profiles, setProfiles] = useState<DiscordLinkProfile[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedCount = useMemo(() => profiles.filter((profile) => Boolean(profile.discordUserId?.trim())).length, [profiles]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/discord-links");
      const payload = (response.data ?? {
        profiles: [],
      }) as DiscordLinksPayload;
      setProfiles(payload.profiles);
      setDraftValues(Object.fromEntries(payload.profiles.map((profile) => [profile.id, profile.discordUserId ?? ""])));
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
    return scheduleEffectTask(loadProfiles);
  }, [loadProfiles]);

  async function saveLink(profile: DiscordLinkProfile, discordUserId: string) {
    setSavingProfileId(profile.id);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/discord-links", {
        method: "PATCH",
        body: JSON.stringify({
          profileId: profile.id,
          discordUserId,
        }),
      });
      const updatedProfile = (response.data?.profile ?? null) as DiscordLinkProfile | null;
      if (updatedProfile) {
        setProfiles((currentProfiles) =>
          currentProfiles.map((currentProfile) => (currentProfile.id === updatedProfile.id ? updatedProfile : currentProfile)),
        );
        setDraftValues((currentValues) => ({
          ...currentValues,
          [profile.id]: updatedProfile.discordUserId ?? "",
        }));
      }
      setMessage(response.message ?? "Discord link updated.");
    } catch (saveError: unknown) {
      setError(
        toUserFacingErrorMessage(saveError, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
    } finally {
      setSavingProfileId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Discord Team Links</h2>
        <p className="mt-1 text-sm text-text-muted">
          Link Discord provider user IDs to Bravo team-access profiles. Unlinked Discord sign-ins stay denied until an admin adds the ID
          here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Team Profiles</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{profiles.length}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Linked Discord IDs</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{linkedCount}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Pending Links</p>
          <p className="mt-3 font-mono-stat text-3xl text-white">{Math.max(profiles.length - linkedCount, 0)}</p>
        </div>
      </div>

      {message || error ? (
        <div
          className={`rounded-card border px-4 py-3 text-sm ${
            error ? "border-bravoRed/30 bg-bravoRed/10 text-red-200" : "border-accent-green/30 bg-accent-green/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      ) : null}

      {loading ? (
        <div className="esports-card p-6 text-sm text-text-muted">Loading Discord links...</div>
      ) : profiles.length === 0 ? (
        <div className="esports-card p-6 text-sm text-text-muted">No team-access profiles are ready for Discord linking yet.</div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => {
            const draftValue = draftValues[profile.id] ?? "";
            const isSaving = savingProfileId === profile.id;

            return (
              <div key={profile.id} className="esports-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">{profile.role.replace(/_/g, " ")}</p>
                    <h3 className="mt-2 text-lg font-black text-white">{profile.displayName ?? profile.email}</h3>
                    <p className="mt-2 text-sm text-text-muted">
                      {profile.email}
                      {profile.teamName ? ` | ${profile.teamName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                      profile.discordUserId
                        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                        : "border-white/10 bg-white/[0.04] text-text-muted"
                    }`}
                  >
                    {profile.discordUserId ? "Linked" : "Unlinked"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <input
                    className="input-esports"
                    value={draftValue}
                    onChange={(event) =>
                      setDraftValues((currentValues) => ({
                        ...currentValues,
                        [profile.id]: event.target.value,
                      }))
                    }
                    placeholder="Discord provider user ID"
                  />
                  <button
                    type="button"
                    onClick={() => void saveLink(profile, draftValue)}
                    disabled={isSaving}
                    className="btn-primary disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Link"}
                  </button>
                  <button type="button" onClick={() => void saveLink(profile, "")} disabled={isSaving} className="btn-secondary">
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
