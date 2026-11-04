"use client";

import { useEffect, useMemo, useState } from "react";

type MatchChoice = {
  id: string;
  pubgMatchId?: string;
  sequenceNumber: number;
  map: string;
  eventName: string;
  playedAt?: string;
  winner?: string;
};
type Scene = "full" | "scoreboard" | "winner" | "mvp" | "players" | "lower-third";

const scenes: Array<{ id: Scene; title: string; detail: string; symbol: string }> = [
  { id: "full", title: "Full broadcast", detail: "Scoreboard, MVP and winner panels", symbol: "▦" },
  { id: "scoreboard", title: "Team scoreboard", detail: "Placement, kills and total points", symbol: "▤" },
  { id: "winner", title: "Winner reveal", detail: "Champion team announcement", symbol: "♛" },
  { id: "mvp", title: "MVP reveal", detail: "Top player and match performance", symbol: "★" },
  { id: "players", title: "Player statistics", detail: "Kills, assists and damage", symbol: "◈" },
  { id: "lower-third", title: "Lower third", detail: "Compact gameplay name banner", symbol: "▬" },
];

export default function BroadcastControlRoom() {
  const [matches, setMatches] = useState<MatchChoice[]>([]);
  const [matchId, setMatchId] = useState("");
  const [scene, setScene] = useState<Scene>("scoreboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/overlay/matches", { cache: "no-store" });
        const payload = (await response.json()) as { data?: MatchChoice[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load matches.");
        if (!active) return;
        setMatches(payload.data ?? []);
        setMatchId((current) => current || payload.data?.[0]?.id || "");
        setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load matches.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const selectedMatch = matches.find((match) => match.id === matchId);
  const overlayUrl = useMemo(() => {
    if (!baseUrl || !matchId) return "";
    return `${baseUrl}/overlay?matchId=${encodeURIComponent(matchId)}&scene=${scene}`;
  }, [baseUrl, matchId, scene]);

  const copyUrl = async () => {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard permission was blocked. Copy the URL from the field below.");
    }
  };

  return (
    <main className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.3em] text-cyan-300">Bravo Gaming Esports</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Broadcast control room</h1>
            <p className="mt-2 text-sm text-slate-400">Choose a published match and prepare your OBS browser graphic.</p>
          </div>
          <a href="/admin" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">Admin dashboard ↗</a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0b1624] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">01 / Match selection</p>
            <h2 className="mt-2 text-xl font-extrabold">Select a published match</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Only published match results appear here. Draft matches are hidden from the public broadcast feed.</p>
            {loading ? <p className="mt-6 text-sm text-slate-400">Loading published matches…</p> : null}
            {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null}
            {!loading && matches.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-300">No published matches found. Publish a match in the admin panel, then refresh this page.</div> : null}
            <div className="mt-5 space-y-2">
              {matches.map((match) => (
                <button key={match.id} onClick={() => setMatchId(match.id)} className={`w-full rounded-xl border p-4 text-left transition ${matchId === match.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-black/10 hover:border-white/25"}`}>
                  <span className="flex items-center justify-between gap-3"><b className="truncate text-sm">{match.eventName} · Match {match.sequenceNumber || "—"}</b><span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-emerald-300">Published</span></span>
                  <span className="mt-1 block text-xs text-slate-400">{match.map}{match.playedAt ? ` · ${new Date(match.playedAt).toLocaleDateString()}` : ""}</span>
                  <span className="mt-2 block truncate font-mono text-[10px] text-slate-500">{match.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1624] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">02 / Graphic selection</p>
            <h2 className="mt-2 text-xl font-extrabold">Choose broadcast scene</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {scenes.map((item) => (
                <button key={item.id} onClick={() => setScene(item.id)} className={`rounded-xl border p-4 text-left transition ${scene === item.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-black/10 hover:border-white/25"}`}>
                  <span className="text-2xl text-cyan-200">{item.symbol}</span>
                  <b className="mt-3 block text-sm">{item.title}</b>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{item.detail}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">03 / OBS browser source URL</p>
              <p className="mt-2 text-xs text-slate-300">{selectedMatch ? `${selectedMatch.eventName} · ${selectedMatch.map}` : "Select a match to generate the overlay URL."}</p>
              <textarea readOnly value={overlayUrl} rows={3} className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#050b14] p-3 font-mono text-[11px] leading-5 text-cyan-100 outline-none" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={!overlayUrl} onClick={() => void copyUrl()} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-40">{copied ? "Copied ✓" : "Copy OBS URL"}</button>
                <a aria-disabled={!overlayUrl} href={overlayUrl || undefined} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-40">Preview overlay ↗</a>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0b1624] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">04 / OBS setup</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><b className="text-sm">1. Add source</b><p className="mt-1 text-xs leading-5 text-slate-400">OBS → Sources → + → Browser.</p></div>
            <div><b className="text-sm">2. Set dimensions</b><p className="mt-1 text-xs leading-5 text-slate-400">Width 1920, height 1080. Keep background transparent.</p></div>
            <div><b className="text-sm">3. Layer above game</b><p className="mt-1 text-xs leading-5 text-slate-400">Place the browser source above your PUBG gameplay capture.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
