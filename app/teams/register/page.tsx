"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import {
  formatUploadSize,
  getUploadMaxBytes,
  TEAM_LOGO_FILE_INPUT_ACCEPT,
} from "@/lib/upload-config";
import { validateUpload } from "@/lib/upload-validation";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

type UploadedRegistrationLogo = {
  id: string;
  path: string;
  url: string;
};

function RegisterForm() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament") ?? "";
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoPreviewUrlRef = useRef<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainDiscord, setCaptainDiscord] = useState("");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [uploadedLogo, setUploadedLogo] = useState<UploadedRegistrationLogo | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamLogoMaxSize = formatUploadSize(getUploadMaxBytes("team_logo"));

  useEffect(() => {
    return () => {
      if (logoPreviewUrlRef.current) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
    };
  }, []);

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
        | ({ error?: string } & Partial<UploadedRegistrationLogo>)
        | Record<string, never>;

      if (!response.ok || !data.id || !data.path || !data.url) {
        throw new Error(
          getResponseErrorMessage(response, (data as { error?: string }).error, {
            fallback: USER_FACING_ERROR_MESSAGES.registration,
          })
        );
      }

      const nextLogo = {
        id: data.id,
        path: data.path,
        url: data.url,
      } satisfies UploadedRegistrationLogo;

      setUploadedLogo(nextLogo);
      setLogoNotice("Team logo uploaded privately and ready for admin review.");
      setError(null);
    } catch (uploadError: unknown) {
      clearLogoPreviewObjectUrl();
      setLogoPreview(null);
      setLogoError(
        toUserFacingErrorMessage(uploadError, {
          fallback: USER_FACING_ERROR_MESSAGES.registration,
        })
      );
      setLogoNotice(null);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadedLogo) {
      setError("Upload the team logo before you submit your registration.");
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
          captainName,
          captainDiscord,
          playerNames: playerNames.filter(Boolean),
          tournamentId: tournamentId || undefined,
          logoUploadId: uploadedLogo.id,
          logoPath: uploadedLogo.path,
          logoUrl: uploadedLogo.url,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, (data as { error?: string }).error, {
            fallback: USER_FACING_ERROR_MESSAGES.registration,
          })
        );
      }

      setSuccess(true);
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.registration,
        })
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="esports-card p-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-bravoGreen/30 bg-bravoGreen/15 text-sm font-black uppercase tracking-[0.2em] text-bravoGreen">
          Sent
        </div>
        <h2 className="mt-6 text-2xl font-black text-white">Registration submitted</h2>
        <p className="mt-3 text-slate-400">
          Your team and logo are pending review. We&apos;ll follow up through Discord once the registration has been approved.
        </p>
        <Link href="/teams" className="btn-esports-primary mt-8 inline-flex">
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="esports-card space-y-6 p-8">
      {tournamentId ? (
        <div className="rounded-xl border border-bravoBlue/25 bg-bravoBlue/10 px-4 py-3 text-sm text-bravoBlue">
          Tournament entry: <strong>{tournamentId}</strong>
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Team Name *
        </label>
        <input
          className="input-esports"
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
          required
          placeholder="Your team name"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Captain Name *
          </label>
          <input
            className="input-esports"
            value={captainName}
            onChange={(event) => setCaptainName(event.target.value)}
            required
            placeholder="In-game name"
          />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Captain Discord *
          </label>
          <input
            className="input-esports"
            value={captainDiscord}
            onChange={(event) => setCaptainDiscord(event.target.value)}
            required
            placeholder="username"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Roster (up to 4 players)
        </label>
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
              placeholder={`Player ${index + 1} in-game name`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Team Logo *
        </label>
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
              <img
                src={logoPreview}
                alt="Team logo preview"
                className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs uppercase tracking-[0.14em] text-slate-500">
                Logo Preview
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-white">
                {uploadedLogo ? "Replace uploaded logo" : "Upload team logo to Cloudflare R2"}
              </p>
              <p className="text-xs text-slate-400">
                JPG, PNG, and WEBP only. Max size: {teamLogoMaxSize}.
              </p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="btn-secondary w-full sm:w-auto justify-center disabled:opacity-60"
              >
                {logoUploading ? "Uploading logo..." : uploadedLogo ? "Replace Logo" : "Choose Logo"}
              </button>
            </div>
          </div>
        </div>

        {logoNotice ? (
          <div className="rounded-xl border border-bravoGreen/25 bg-bravoGreen/10 px-4 py-3 text-sm text-bravoGreen">
            {logoNotice}
          </div>
        ) : null}
        {logoError ? (
          <div className="rounded-xl border border-bravoRed/25 bg-bravoRed/10 px-4 py-3 text-sm text-bravoRed">
            {logoError}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-bravoRed/25 bg-bravoRed/10 px-4 py-3 text-sm text-bravoRed">
          {error}
        </div>
      ) : null}

      <button type="submit" disabled={loading || logoUploading} className="btn-esports-primary w-full sm:w-auto">
        {loading ? "Submitting your registration..." : "Submit Registration"}
      </button>
    </form>
  );
}

export default function TeamRegisterPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8 lg:py-10">
      <div className="mb-8">
        <p className="section-title">Team Registration</p>
        <h1 className="section-heading mt-3">Register Your Squad</h1>
        <p className="mt-3 text-slate-400">
          Join Bravo Gaming tournaments and daily scrims with a registration flow that now carries your team logo through review and approval.
        </p>
      </div>
      <Suspense fallback={<div className="esports-card p-8 text-slate-500">Preparing registration form...</div>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
