"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MatchPlayerResult, TeamMatchResult, TournamentMatch } from "@/lib/types";

type OverlayScene = "full" | "scoreboard" | "lower-third" | "mvp" | "winner" | "players";
type OverlayMatch = TournamentMatch & {
  playerResults?: Array<MatchPlayerResult & { headshots?: number }>;
  teamResults?: Array<TeamMatchResult & { logoUrl?: string }>;
};

function getScene(): OverlayScene {
  if (typeof window === "undefined") return "full";
  const value = new URLSearchParams(window.location.search).get("scene");
  return ["scoreboard", "lower-third", "mvp", "winner", "players"].includes(value ?? "") ? (value as OverlayScene) : "full";
}

function getMatchId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("matchId")?.trim() ?? "";
}

function number(value?: number) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function getMvp(match: OverlayMatch) {
  return [...(match.playerResults ?? [])].sort(
    (a, b) => number(b.kills) * 100000 + number(b.damage) - (number(a.kills) * 100000 + number(a.damage)),
  )[0];
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-2xl border border-white/10 bg-[#07111e]/95 shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl ${className}`}>{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">{children}</p>;
}

export default function BroadcastOverlay() {
  const [matchId, setMatchId] = useState("");
  const [scene, setScene] = useState<OverlayScene>("full");
  const [match, setMatch] = useState<OverlayMatch | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    setMatchId(getMatchId());
    setScene(getScene());
    const previousBackground = document.body.style.background;
    const previousDisplay = Array.from(document.body.children).map((node) => ({
      node: node as HTMLElement,
      display: (node as HTMLElement).style.display,
    }));
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    previousDisplay.forEach(({ node }) => {
      if (node.id !== "main-content" && node.tagName !== "SCRIPT") node.style.display = "none";
    });
    const main = document.getElementById("main-content");
    if (main) {
      main.style.height = "100vh";
      main.style.minHeight = "100vh";
      main.style.margin = "0";
      main.style.padding = "0";
      main.style.background = "transparent";
    }
    return () => {
      document.body.style.background = previousBackground;
      previousDisplay.forEach(({ node, display }) => (node.style.display = display));
      document.documentElement.style.background = "";
      if (main) {
        main.style.height = "";
        main.style.minHeight = "";
        main.style.margin = "";
        main.style.padding = "";
        main.style.background = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/overlay/match?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" });
        const payload = (await response.json()) as { match?: OverlayMatch; error?: string };
        if (!response.ok || !payload.match) throw new Error(payload.error ?? "Could not load match data.");
        if (!active) return;
        setMatch(payload.match);
        setError("");
        setUpdatedAt(new Date().toLocaleTimeString());
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Could not load match data.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [matchId]);

  const teams = useMemo(
    () => [...(match?.teamResults ?? [])].sort((a, b) => number(a.placement) - number(b.placement)),
    [match],
  );
  const players = useMemo(
    () => [...(match?.playerResults ?? [])].sort((a, b) => number(b.kills) - number(a.kills) || number(b.damage) - number(a.damage)),
    [match],
  );
  const mvp = match ? getMvp(match) : undefined;
  const winner = teams.find((team) => team.placement === 1) ?? teams[0];
  const map = match?.map || "PUBG PC";
  const matchNumber = match?.sequenceNumber ?? match?.matchNumber ?? 1;

  if (!matchId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111e] p-8 text-white">
        <Panel className="max-w-2xl p-8">
          <Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={76} height={76} className="mb-5 rounded-xl" />
          <Eyebrow>Bravo Gaming Esports · OBS Browser Source</Eyebrow>
          <h1 className="mt-3 text-4xl font-black uppercase">Broadcast graphics</h1>
          <p className="mt-3 text-sm text-slate-300">Add a published match ID to the URL to load your live graphics.</p>
          <p className="mt-4 rounded-lg bg-black/40 p-3 font-mono text-xs text-cyan-200">/overlay?matchId=YOUR_MATCH_ID</p>
          <p className="mt-3 text-xs text-slate-400">Choose a scene with &amp;scene=full, scoreboard, lower-third, mvp, winner, or players.</p>
        </Panel>
      </main>
    );
  }

  if (error && !match) {
    return <main className="flex min-h-screen items-center justify-center bg-transparent p-8 text-white"><Panel className="max-w-xl p-6"><Eyebrow>Bravo Gaming · Broadcast feed</Eyebrow><h1 className="mt-3 text-2xl font-black">Waiting for match data</h1><p className="mt-2 text-sm text-slate-300">{error}</p></Panel></main>;
  }

  if (!match) return <main className="min-h-screen bg-transparent" />;

  const matchLabel = `${match.eventName || "BRAVO GAMING SCRIMS"} · MATCH ${matchNumber}`;
  const accent = { borderColor: "rgba(34,211,238,.35)" };

  const winnerGraphic = (
    <Panel className="w-full max-w-4xl" >
      <div className="flex items-center gap-5 border-b border-white/10 px-7 py-4" style={accent}>
        <Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={42} height={42} className="rounded-lg" />
        <div className="flex-1"><Eyebrow>Match winner</Eyebrow><p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{matchLabel} · {map}</p></div>
        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[10px] font-black tracking-widest text-amber-200">#1 CHICKEN DINNER</span>
      </div>
      <div className="flex items-center gap-6 px-8 py-7">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-600 text-4xl font-black text-slate-950">1</div>
        <div className="min-w-0 flex-1"><Eyebrow>Winner</Eyebrow><h2 className="mt-1 truncate text-5xl font-black uppercase tracking-tight text-white">{winner?.teamName ?? match.winner ?? "Winner TBC"}</h2><p className="mt-2 text-sm font-semibold text-slate-300">{number(winner?.kills)} KILLS <span className="mx-2 text-cyan-300">/</span> {number(winner?.totalPoints)} POINTS</p></div>
        <div className="text-right"><p className="text-4xl font-black tabular-nums text-amber-200">{number(winner?.placement) || 1}<sup className="text-lg">ST</sup></p><Eyebrow>Place</Eyebrow></div>
      </div>
    </Panel>
  );

  const mvpGraphic = (
    <Panel className="w-full max-w-3xl">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4"><Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={40} height={40} className="rounded-lg" /><div><Eyebrow>Bravo Gaming · Match MVP</Eyebrow><p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{matchLabel}</p></div></div>
      <div className="flex items-center gap-6 px-7 py-7"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-amber-300/70 bg-amber-300/10 text-4xl">★</div><div className="min-w-0 flex-1"><Eyebrow>Most valuable player</Eyebrow><h2 className="mt-1 truncate text-4xl font-black uppercase text-white">{mvp?.playerName ?? "MVP TBC"}</h2><p className="mt-1 text-sm font-bold text-cyan-200">{mvp?.teamName ?? "Team TBC"}</p></div><div className="grid grid-cols-3 gap-4 text-center"><div><b className="block text-3xl font-black">{number(mvp?.kills)}</b><Eyebrow>Kills</Eyebrow></div><div><b className="block text-3xl font-black">{number(mvp?.damage)}</b><Eyebrow>Damage</Eyebrow></div><div><b className="block text-3xl font-black">{number(mvp?.assists)}</b><Eyebrow>Assists</Eyebrow></div></div></div>
    </Panel>
  );

  const scoreboardGraphic = (
    <Panel className="w-full max-w-5xl">
      <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4"><Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={38} height={38} className="rounded-lg" /><div className="min-w-0 flex-1"><Eyebrow>Live match scoreboard</Eyebrow><p className="mt-1 truncate text-sm font-bold uppercase tracking-wider text-white">{matchLabel} · {map}</p></div><span className="text-xs font-black tracking-widest text-cyan-200">BRAVO ESPORTS</span></div>
      <div className="grid grid-cols-[52px_1fr_72px_72px_90px] gap-3 bg-white/[.06] px-5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><span>#</span><span>Team</span><span className="text-right">Kills</span><span className="text-right">Place</span><span className="text-right">Points</span></div>
      {teams.slice(0, 12).map((team, index) => <div key={team.teamId ?? team.teamName} className="grid grid-cols-[52px_1fr_72px_72px_90px] items-center gap-3 border-t border-white/[.06] px-5 py-3"><span className={`text-lg font-black ${index === 0 ? "text-amber-200" : "text-slate-500"}`}>{String(index + 1).padStart(2, "0")}</span><span className="truncate text-sm font-extrabold uppercase text-white">{team.teamName}</span><b className="text-right font-mono text-sm text-cyan-100">{number(team.kills)}</b><b className="text-right font-mono text-sm text-slate-300">{number(team.placement)}</b><b className="text-right font-mono text-lg text-white">{number(team.totalPoints)}</b></div>)}
    </Panel>
  );

  const playersGraphic = (
    <Panel className="w-full max-w-5xl">
      <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4"><Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={38} height={38} className="rounded-lg" /><div><Eyebrow>Player performance</Eyebrow><p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{matchLabel} · {map}</p></div></div>
      <div className="grid grid-cols-[1fr_110px_110px_110px_90px] gap-3 bg-white/[.06] px-5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><span>Player / Team</span><span className="text-right">Kills</span><span className="text-right">Assists</span><span className="text-right">Damage</span><span className="text-right">HS</span></div>
      {players.slice(0, 10).map((player) => <div key={player.playerId} className="grid grid-cols-[1fr_110px_110px_110px_90px] items-center gap-3 border-t border-white/[.06] px-5 py-3"><span className="min-w-0"><b className="block truncate text-sm uppercase text-white">{player.playerName}</b><small className="text-[10px] font-bold uppercase text-slate-400">{player.teamName}</small></span><b className="text-right font-mono text-sm text-cyan-100">{number(player.kills)}</b><b className="text-right font-mono text-sm text-slate-300">{number(player.assists)}</b><b className="text-right font-mono text-sm text-white">{number(player.damage)}</b><b className="text-right font-mono text-sm text-amber-200">{player.headshots == null ? "—" : number(player.headshots)}</b></div>)}
      <p className="px-5 py-2 text-[9px] text-slate-500">Headshots show only when supplied by the imported match data.</p>
    </Panel>
  );

  const lowerThird = (
    <div className="flex w-full max-w-4xl items-center gap-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-cyan-300/40 bg-[#07111e]/95 p-2"><Image src="/images/bravo-logo.png" alt="Bravo Gaming" width={54} height={54} /></div>
      <div className="min-w-0 flex-1 border-l-4 border-cyan-300 bg-gradient-to-r from-[#07111e]/95 via-[#07111e]/90 to-transparent px-5 py-3 shadow-xl"><Eyebrow>{matchLabel} · {map}</Eyebrow><p className="mt-1 truncate text-2xl font-black uppercase text-white">{winner?.teamName ?? match.winner ?? "Match in progress"}</p></div>
      <div className="rounded-xl border border-white/10 bg-[#07111e]/95 px-5 py-3 text-right"><Eyebrow>Winner</Eyebrow><p className="text-2xl font-black text-amber-200">{number(winner?.totalPoints)} PTS</p></div>
    </div>
  );

  return (
    <main className="flex min-h-screen w-full items-end justify-center bg-transparent p-8 text-white">
      <div className="w-full">
        {scene === "winner" ? winnerGraphic : null}
        {scene === "mvp" ? mvpGraphic : null}
        {scene === "scoreboard" ? scoreboardGraphic : null}
        {scene === "players" ? playersGraphic : null}
        {scene === "lower-third" ? lowerThird : null}
        {scene === "full" ? <div className="grid w-full grid-cols-2 items-end gap-4"><div>{winnerGraphic}</div><div>{mvpGraphic}</div><div className="col-span-2">{scoreboardGraphic}</div></div> : null}
        <div className="mt-2 flex justify-end"><span className="rounded bg-black/50 px-2 py-1 text-[9px] font-mono text-slate-500">AUTO-REFRESH 5s {updatedAt ? `· UPDATED ${updatedAt}` : ""}</span></div>
      </div>
    </main>
  );
}
