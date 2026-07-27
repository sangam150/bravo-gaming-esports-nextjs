"use client";

import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { scheduleEffectTask } from "@/lib/effect-task";
import type { RegistrationTargetSummary } from "@/lib/team-registration";
import { formatUploadSize, getUploadMaxBytes, TEAM_LOGO_FILE_INPUT_ACCEPT } from "@/lib/upload-config";
import { validateUpload } from "@/lib/upload-validation";
import { getResponseErrorMessage, toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type UploadedRegistrationLogo = {
  id: string;
  path: string;
  url: string;
};

function formatRegistrationTargetOption(target: RegistrationTargetSummary) {
  if (!target.startDate) {
    return target.title;
  }

  const parsedDate = new Date(target.startDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return target.title;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(parsedDate);

  return `${target.title} • ${formattedDate}`;
}

function RegistrationStatusFlow() {
  const steps = [
    {
      title: "Submitted",
      detail: "Your roster, logo, and event entry are received by Bravo.",
      tone: "border-accent-blue/25 bg-accent-blue/10 text-accent-blue-light",
    },
    {
      title: "Under Review",
      detail: "Admins verify roster details, event eligibility, and branding assets.",
      tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    },
    {
      title: "Approved",
      detail: "Your slot is confirmed through official Bravo channels.",
      tone: "border-bravoGreen/25 bg-bravoGreen/10 text-bravoGreen",
    },
    {
      title: "Rejected / Needs Changes",
      detail: "If anything is missing, Bravo will request updates before approval.",
      tone: "border-bravoRed/25 bg-bravoRed/10 text-bravoRed",
    },
  ] as const;

  return (
    <section className="esports-card p-6">
      <p className="section-title">Registration Status</p>
      <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">What happens after you submit</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <div key={step.title} className="rounded-[22px] border border-white/[0.08] bg-black/20 p-4">
            <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${step.tone}`}>
              {step.title}
            </span>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TeamRegistrationPageClient({
  availableTournaments,
  hasEventQuery,
  selectedTournament,
}: {
  availableTournaments: RegistrationTargetSummary[];
  hasEventQuery: boolean;
  selectedTournament: RegistrationTargetSummary | null;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoPreviewUrlRef = useRef<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainDiscord, setCaptainDiscord] = useState("");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [selectedEventId, setSelectedEventId] = useState(selectedTournament?.id ?? "");
  const [uploadedLogo, setUploadedLogo] = useState<UploadedRegistrationLogo | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamLogoMaxSize = formatUploadSize(getUploadMaxBytes("team_logo"));
  const selectedTarget =
    availableTournaments.find((tournament) => tournament.id === selectedEventId) ??
    (selectedTournament?.id === selectedEventId ? selectedTournament : null);
  const invalidTournamentSelection = hasEventQuery && !selectedTournament && !selectedTarget;
  const tournamentClosed = selectedTarget?.registrationState && selectedTarget.registrationState !== "open";
  const submitBlocked = loading || logoUploading || invalidTournamentSelection || Boolean(tournamentClosed);

  useEffect(() => {
    return () => {
      if (logoPreviewUrlRef.current) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTournament?.id) {
      return scheduleEffectTask(() => setSelectedEventId(selectedTournament.id));
    }
  }, [selectedTournament?.id]);

  function clearLogoPreviewObjectUrl() {
    if (!logoPreviewUrlRef.current) return;
    URL.revokeObjectURL(logoPreviewUrlRef.current);
    logoPreviewUrlRef.current = null;
  }

  async function handleLogoUpload(file: File) {
    const validationError = validateUpload({
      audience: "team",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "team_logo",
    });

    if (validationError) {
      setLogoError(validationError);
      setLogoNotice(null);
      return;
    }

    setLogoUploading(true);
    setLogoError(null);
    setLogoNotice("Uploading team logo...");

    clearLogoPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    logoPreviewUrlRef.current = objectUrl;
    setLogoPreview(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamName", teamName || captainName || "registration");
      if (uploadedLogo?.url) {
        formData.append("previousUrl", uploadedLogo.url);
      }

      const response = await fetch("/api/registrations/logo", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as
        ({ error?: string } & Partial<UploadedRegistrationLogo>) | Record<string, never>;

      if (!response.ok || !data.id || !data.path || !data.url) {
        throw new Error(
          getResponseErrorMessage(response, (data as { error?: string }).error, {
            fallback: USER_FACING_ERROR_MESSAGES.registration,
          }),
        );
      }

      setUploadedLogo({
        id: data.id,
        path: data.path,
        url: data.url,
      });
      setLogoNotice("Team logo uploaded privately and ready for admin review.");
      setError(null);
    } catch (uploadError: unknown) {
      clearLogoPreviewObjectUrl();
      setLogoPreview(null);
      setLogoError(
        toUserFacingErrorMessage(uploadError, {
          fallback: USER_FACING_ERROR_MESSAGES.registration,
        }),
      );
      setLogoNotice(null);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (invalidTournamentSelection) {
      setError("The selected event is unavailable. Open registration from a published event page and try again.");
      return;
    }

    if (tournamentClosed) {
      setError(selectedTournament?.registrationMessage ?? "Registration is not open for this event right now.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          teamTag,
          captainName,
          captainDiscord,
          playerNames: playerNames.filter(Boolean),
          tournamentId: selectedTarget?.id || undefined,
          logoUploadId: uploadedLogo?.id,
          logoPath: uploadedLogo?.path,
          logoUrl: uploadedLogo?.url,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, (data as { error?: string }).error, {
            fallback: USER_FACING_ERROR_MESSAGES.registration,
          }),
        );
      }

      setSuccess(true);
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.registration,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="esports-card p-10 text-center sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-bravoGreen/30 bg-bravoGreen/15 text-sm font-black uppercase tracking-[0.2em] text-bravoGreen">
          Sent
        </div>
        <h2 className="mt-6 text-2xl font-black text-white">Your team registration has been submitted.</h2>
        <p className="mt-3 text-slate-300">Bravo admins will review your team details and confirm your slot through official channels.</p>
        <p className="mt-2 text-sm text-slate-400">Expected review time: within 24 hours.</p>
        {selectedTarget?.title ? <p className="mt-2 text-sm text-accent-blue-light">Selected event: {selectedTarget.title}</p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn-secondary">
            Contact Bravo
          </Link>
          <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
            Join Discord
          </a>
          <Link href="/teams" className="btn-primary">
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:py-10">
      <div className="mb-8">
        <p className="section-title">Team Registration</p>
        <h1 className="section-heading mt-3">Register Your Squad</h1>
        <p className="mt-3 text-slate-400">
          Submit your roster for Bravo Gaming Esports scrims and tournaments. Admins verify event eligibility, team details, and optional
          logo assets before confirming slots.
        </p>
      </div>

      <div className="space-y-6">
        <RegistrationStatusFlow />

        <form onSubmit={handleSubmit} className="esports-card space-y-6 p-8">
          {selectedTarget ? (
            <div className="rounded-2xl border border-accent-blue/25 bg-accent-blue/10 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Selected Event</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{selectedTarget.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{selectedTarget.registrationMessage}</p>
            </div>
          ) : hasEventQuery ? (
            <div className="rounded-2xl border border-bravoRed/25 bg-bravoRed/10 px-5 py-4 text-sm text-bravoRed">
              The event linked from the URL is unavailable. Choose an open public event below and try again.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-slate-300">
              Choose an open Bravo event by name below, or keep the form on the general Bravo review queue if you need manual placement
              during launch prep.
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Select Event</label>
            <select className="input-esports" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
              <option value="">General Bravo review queue (manual placement)</option>
              {availableTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {formatRegistrationTargetOption(tournament)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Public events are listed by name only. If no live event is open yet, use the general review queue and include your
              Discord/contact details so Bravo can follow up manually before a slot is confirmed.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Team Name *</label>
              <input
                className="input-esports"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                required
                placeholder="Your team name"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Team Tag / Clan Code</label>
              <input
                className="input-esports"
                value={teamTag}
                onChange={(event) => setTeamTag(event.target.value)}
                placeholder="Short tag used on scoreboards and lobby sheets"
              />
              <p className="mt-2 text-xs text-slate-500">
                This short tag helps Bravo show your roster clearly on scoreboards, lobby sheets, and event graphics.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">IGL / Manager Name *</label>
              <input
                className="input-esports"
                value={captainName}
                onChange={(event) => setCaptainName(event.target.value)}
                required
                placeholder="Primary team contact"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Discord Contact *</label>
              <input
                className="input-esports"
                value={captainDiscord}
                onChange={(event) => setCaptainDiscord(event.target.value)}
                required
                placeholder="discord username"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Player IGN Fields</label>
            <div className="space-y-3">
              {playerNames.map((name, index) => (
                <input
                  key={index}
                  className="input-esports"
                  value={name}
                  onChange={(event) => {
                    const updated = [...playerNames];
                    updated[index] = event.target.value;
                    setPlayerNames(updated);
                  }}
                  placeholder={`Player ${index + 1} IGN`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Team Logo (Optional)</label>
            <input
              ref={logoInputRef}
              type="file"
              accept={TEAM_LOGO_FILE_INPUT_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleLogoUpload(file);
                }
                event.target.value = "";
              }}
            />
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Team logo preview"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs uppercase tracking-[0.14em] text-slate-500">
                    Optional Logo
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-semibold text-white">
                    {uploadedLogo ? "Replace uploaded logo" : "Upload a team logo if you have one"}
                  </p>
                  <p className="text-xs text-slate-400">
                    JPG, PNG, and WEBP only. Max size: {teamLogoMaxSize}. You can still submit without a logo.
                  </p>
                  <p className="text-xs text-slate-500">
                    If you skip the logo now, Bravo can still review your registration and collect branding later through Discord or the
                    contact page.
                  </p>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="btn-secondary w-full justify-center disabled:opacity-60 sm:w-auto"
                  >
                    {logoUploading ? "Uploading logo..." : uploadedLogo ? "Replace Logo" : "Choose Logo"}
                  </button>
                </div>
              </div>
            </div>

            {logoNotice ? (
              <div className="rounded-xl border border-bravoGreen/25 bg-bravoGreen/10 px-4 py-3 text-sm text-bravoGreen">{logoNotice}</div>
            ) : null}
            {logoError ? (
              <div className="rounded-xl border border-bravoRed/25 bg-bravoRed/10 px-4 py-3 text-sm text-bravoRed">{logoError}</div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-bravoRed/25 bg-bravoRed/10 px-4 py-3 text-sm text-bravoRed">{error}</div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitBlocked} className="btn-esports-primary w-full sm:w-auto">
              {loading ? "Submitting your registration..." : "Submit Registration"}
            </button>
            <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord w-full justify-center sm:w-auto">
              Join Discord
            </a>
            <Link href="/contact" className="btn-secondary w-full justify-center sm:w-auto">
              Contact Admin
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Registration fallback: if no public event is open or you need manual help, submit here first and Bravo will continue the
            conversation through Discord or your contact details.
          </p>
        </form>
      </div>
    </main>
  );
}
