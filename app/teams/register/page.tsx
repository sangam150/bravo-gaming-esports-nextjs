"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

function RegisterForm() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament") ?? "";

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainDiscord, setCaptainDiscord] = useState("");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        <div className="hidden" aria-hidden="true">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-bravoGreen/15 text-4xl text-bravoGreen">✓</div>
        </div>
        <h2 className="mt-6 text-2xl font-black text-white">Registration submitted</h2>
        <p className="mt-3 text-slate-400">
          Your registration is pending review. We&apos;ll follow up through Discord once it has been approved.
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
          <span className="hidden" aria-hidden="true">
          🏆 Registering for tournament <strong>{tournamentId}</strong>
          </span>
        </div>
      ) : null}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Team Name *</label>
        <input className="input-esports" value={teamName} onChange={(e) => setTeamName(e.target.value)} required placeholder="Your team name" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Captain Name *</label>
          <input className="input-esports" value={captainName} onChange={(e) => setCaptainName(e.target.value)} required placeholder="In-game name" />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Captain Discord *</label>
          <input className="input-esports" value={captainDiscord} onChange={(e) => setCaptainDiscord(e.target.value)} required placeholder="username" />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Roster (up to 4 players)</label>
        <div className="space-y-3">
          {playerNames.map((name, i) => (
            <input
              key={i}
              className="input-esports"
              value={name}
              onChange={(e) => {
                const updated = [...playerNames];
                updated[i] = e.target.value;
                setPlayerNames(updated);
              }}
              placeholder={`Player ${i + 1} in-game name`}
            />
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-xl border border-bravoRed/25 bg-bravoRed/10 px-4 py-3 text-sm text-bravoRed">
          {error}
        </div>
      ) : null}
      <button type="submit" disabled={loading} className="btn-esports-primary w-full sm:w-auto">
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
          Join Bravo Gaming tournaments and daily scrims with a registration flow that stays simple and review-ready.
        </p>
      </div>
      <Suspense fallback={<div className="esports-card p-8 text-slate-500">Preparing registration form...</div>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
