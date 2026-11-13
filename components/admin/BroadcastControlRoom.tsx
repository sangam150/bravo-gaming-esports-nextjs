"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { BROADCAST_GRAPHIC_GROUPS, DEFAULT_BROADCAST_STATE, type BroadcastState } from "@/lib/broadcast";
import { parseBroadcastState } from "@/lib/broadcast";
import { studioSignature, type StudioAction } from "@/lib/broadcast-studio";
import FileUpload from "./FileUpload";
import BroadcastTemplateEditor from "./BroadcastTemplateEditor";
import { defaultBroadcastTemplate } from "@/lib/broadcast-template";
import { formatEventDateTimeInput, eventDateTimeLocalToUtcIso } from "@/lib/event-datetime";
import type { Scrim, Tournament, TournamentMatch } from "@/lib/types";
import { scheduleEffectTask } from "@/lib/effect-task";
import { parseEventSchedule, scheduleForDay } from "@/lib/event-schedule";
import { parseEventProduction, type EventProduction } from "@/lib/event-production";

const fieldClass = "w-full rounded-md border border-white/15 bg-bg-primary px-3 py-2 text-sm text-white";

export default function BroadcastControlRoom({ initialTournamentId = "" }: { initialTournamentId?: string }) {
  const [state, setState] = useState<BroadcastState | null>(null);
  const [program, setProgram] = useState<BroadcastState | null>(null);
  const [readySignature, setReadySignature] = useState("");
  const [studioStatus, setStudioStatus] = useState("draft");
  const [production, setProduction] = useState<EventProduction | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [scale, setScale] = useState(0.4);
  const [artworkMap, setArtworkMap] = useState("Erangel");
  const [graphicSearch, setGraphicSearch] = useState("");
  const [eventTeams, setEventTeams] = useState<{ id: string; name: string }[]>([]);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [scrims, setScrims] = useState<Pick<Scrim, "id" | "title" | "date" | "tournamentId" | "published" | "teamCapacity">[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const serverClock = useRef({ epoch: 0, performance: 0 });

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [control, events] = await Promise.all([adminFetch("/api/admin/broadcast"), adminFetch("/api/tournaments?admin=true")]);
      serverClock.current = { epoch: control.serverTime ?? Date.now(), performance: performance.now() };
      const draft = parseBroadcastState({ ...DEFAULT_BROADCAST_STATE, ...(control.data.draft ?? control.data), revision: control.data.revision });
      setState(initialTournamentId && draft.tournamentId !== initialTournamentId ? { ...draft, tournamentId: initialTournamentId, scrimId: "", matchId: "", playerId: "", teamId: "", stageId: "", groupId: "", dayId: "" } : draft);
      setProgram(parseBroadcastState({ ...DEFAULT_BROADCAST_STATE, ...control.data }));
      setReadySignature(control.data.readySignature ?? "");
      setStudioStatus(control.data.studioStatus ?? "hidden");
      setTournaments(events.data ?? []);
      setPreviewKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load broadcast controls.");
    } finally {
      setBusy(false);
    }
  }, [initialTournamentId]);
  useEffect(() => scheduleEffectTask(load), [load]);
  useEffect(() => {
    if (!state?.tournamentId || state.graphic !== "team-slots") return;
    let active = true;
    adminFetch("/api/admin/scrims").then(response => {
      if (active) setScrims((response.data ?? []).filter((scrim: Scrim) => scrim.tournamentId === state.tournamentId && !scrim.deletedAt).map((scrim: Scrim) => ({ id: scrim.id, title: scrim.title, date: scrim.date, tournamentId: scrim.tournamentId, published: scrim.published, teamCapacity: scrim.teamCapacity })));
    }).catch(() => { if (active) { setScrims([]); setError("Could not load scrim slots. Reload controls before showing this graphic."); } });
    return () => { active = false; };
  }, [state?.tournamentId, state?.graphic, previewKey]);
  const previewReady = state !== null;
  useEffect(() => {
    const id = state?.tournamentId;
    if (!id) return;
    let active = true;
    adminFetch(`/api/tournaments/${encodeURIComponent(id)}?admin=true`)
      .then((response) => {
        if (active) setMatches(response.data.matches ?? []);
        if (active) setProduction(response.data.production ? parseEventProduction(response.data.production) : null);
        if (active) {
          const schedule = parseEventSchedule(response.data.schedule);
          setScheduleCount(
            schedule
              ? scheduleForDay(
                  schedule.matches,
                  schedule.timeZone,
                  serverClock.current.epoch + performance.now() - serverClock.current.performance,
                ).length
              : 0,
          );
        }
        if (active)
          setEventTeams(
            Array.from(
              new Map(
                (response.data.matches ?? [])
                  .flatMap((match: TournamentMatch) => match.teamResults ?? [])
                  .filter((team: { teamId?: string }) => team.teamId)
                  .map((team: { teamId: string; teamName: string }) => [team.teamId, { id: team.teamId, name: team.teamName }]),
              ).values(),
            ) as { id: string; name: string }[],
          );
      })
      .catch(() => {
        if (active) {
          setMatches([]);
          setError("Could not load published matches. Reload controls.");
        }
      });
    return () => {
      active = false;
    };
  }, [state?.tournamentId, previewKey]);
  useEffect(() => {
    if (!previewRef.current) return;
    const observer = new ResizeObserver((entries) => setScale(entries[0].contentRect.width / 1920));
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewReady]);
  const sendPresentation = useCallback(() => {
    if (!state) return;
    previewFrameRef.current?.contentWindow?.postMessage({ type: "bravo:studio:presentation", graphic: state.graphic, presentation: state.templates?.[state.graphic] ?? defaultBroadcastTemplate(state.graphic), lowerTitle: state.lowerTitle, lowerSubtitle: state.lowerSubtitle }, window.location.origin);
  }, [state]);
  useEffect(() => { sendPresentation(); }, [sendPresentation]);

  async function update(patch: Partial<BroadcastState>, reveal = false, base = state, requestedAction?: StudioAction) {
    if (!base || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const action = requestedAction ?? (reveal ? "reveal" : base === program ? patch.visible === false ? "hide" : "refresh" : patch.visible === true ? "take" : "preview");
      const response = await adminFetch("/api/admin/broadcast", { method: "PUT", body: JSON.stringify({ ...base, ...patch, action }) });
      setState(parseBroadcastState({ ...DEFAULT_BROADCAST_STATE, ...(response.data.draft ?? response.data), revision: response.data.revision }));
      setProgram(parseBroadcastState({ ...DEFAULT_BROADCAST_STATE, ...response.data }));
      setReadySignature(response.data.readySignature ?? "");
      setStudioStatus(response.data.studioStatus ?? "hidden");
      setPreviewKey((value) => value + 1);
      setMessage(["draft", "preview", "ready"].includes(action) ? `Next graphic ${action} saved. The live program is unchanged.` : response.data.visible ? "Graphic is on air. OBS updates within a few seconds." : "Program graphic is hidden.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Broadcast update failed.");
    } finally {
      setBusy(false);
    }
  }
  async function copyUrl(graphic: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/overlay/${graphic}`);
      setMessage("OBS browser-source URL copied. Set width 1920 and height 1080.");
    } catch {
      setError("Clipboard unavailable. Copy the URL shown below.");
    }
  }
  if (!state)
    return (
      <section className="esports-card space-y-4 p-6">
        <h2 className="text-xl font-bold">Broadcast Studio</h2>
        <p role={error ? "alert" : "status"}>{error || "Loading controls…"}</p>
        <button className="btn-secondary" disabled={busy} onClick={() => void load()}>
          Reload controls
        </button>
      </section>
    );
  const selectedMatch = matches.find((match) => match.id === state.matchId && match.tournamentId === state.tournamentId);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Broadcast Studio</h2>
          <p className="mt-1 text-sm text-text-muted">Published results and graphics for OBS Browser Sources.</p>
        </div>
        <span
          className={`rounded-md px-4 py-2 font-bold ${program?.visible ? "bg-red-500/20 text-red-200" : "bg-white/10 text-slate-300"}`}
        >
          {program?.visible ? "ON AIR" : "HIDDEN"} · Revision {program?.revision ?? 0}
        </span>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-500/10 p-3 text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md bg-cyan-500/10 p-3 text-cyan-100">
          {message}
        </p>
      )}
      <div className="grid gap-5 2xl:grid-cols-[360px_1fr]">
        <div className="esports-card space-y-4 p-5">
          <h3 className="font-bold">A. Select event</h3>
          <label className="block text-sm">
            Tournament
            <select
              className={fieldClass}
              value={state.tournamentId}
              disabled={busy}
              onChange={(event) => {
                setMatches([]);
                setEventTeams([]);
                setState({
                  ...state,
                  tournamentId: event.target.value,
                  scrimId: "",
                  matchId: "",
                  playerId: "",
                  comparisonPlayerId: "",
                  teamId: "",
                  rosterIds: [],
                  countdownTarget: "",
                  stageLabel: "",
                  stageId: "", groupId: "", dayId: "",
                  visible: false,
                });
              }}
            >
              <option value="">Select tournament</option>
              {tournaments.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          {state.graphic === "team-slots" && <label className="block text-sm">
            Scrim team slots
            <select aria-label="Scrim team slots" className={fieldClass} value={state.scrimId ?? ""} disabled={busy} onChange={event => setState({ ...state, scrimId: event.target.value, page: 0 })}>
              <option value="">Select linked scrim</option>
              {scrims.filter(scrim => scrim.tournamentId === state.tournamentId).map(scrim => <option key={scrim.id} value={scrim.id}>{scrim.title} · {scrim.date}{scrim.published ? "" : " · draft"}</option>)}
            </select>
            <span className="mt-1 block text-xs text-text-muted">Uses the saved assignments in Scrims. Publish the scrim before taking its slots live.</span>
          </label>}
          {production && (["stageId", "groupId", "dayId"] as const).map(key => {
            const options = key === "stageId" ? production.stages : (key === "groupId" ? production.groups : production.days).filter(row => !state.stageId || row.stageId === state.stageId);
            return <label key={key} className="block text-sm">{key === "stageId" ? "Stage" : key === "groupId" ? "Group" : "Match day"}<select className={fieldClass} value={state[key] ?? ""} onChange={event => setState({ ...state, [key]: event.target.value, ...(key === "stageId" ? { groupId: "", dayId: "" } : {}), matchId: "", playerId: "", teamId: "", rosterIds: [] })}><option value="">All {key === "stageId" ? "stages" : key === "groupId" ? "groups" : "days"}</option>{options.filter(row => !row.archived).sort((a, b) => a.order - b.order).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>;
          })}
          <label className="block text-sm">
            Match
            <select
              className={fieldClass}
              value={state.matchId}
              disabled={busy}
              onChange={(event) => setState({ ...state, matchId: event.target.value, playerId: "", comparisonPlayerId: "" })}
            >
              <option value="">Tournament graphics only</option>
              {matches
                .filter((match) => match.tournamentId === state.tournamentId)
                .map((match) => (
                  <option key={match.id} value={match.id}>
                    Match {match.matchNumber ?? match.sequenceNumber ?? "—"} · {match.map}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-sm text-text-muted">
            Map: {selectedMatch?.map ?? "No match selected"} · Source: {selectedMatch?.dataSource ?? "—"}
          </p>
          <h3 className="font-bold">B. Select graphic</h3>
          <details><summary className="cursor-pointer text-sm">Event graphic rundown</summary><p className="my-2 text-xs text-text-muted">Arrange the graphic order, then save preview to retain it. Choosing a rundown item prepares the next graphic and leaves the current program on air.</p><ol className="space-y-2">{state.rundown?.map((graphic, index) => <li key={graphic} className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={() => setState({ ...state, graphic, page: 0 })}>{index + 1}. {graphic.replaceAll("-", " ")}</button><button className="btn-secondary" type="button" disabled={index === 0} aria-label={`Move ${graphic} earlier`} onClick={() => { const order = [...state.rundown ?? []]; [order[index], order[index - 1]] = [order[index - 1], order[index]]; setState({ ...state, rundown: order }); }}>↑</button><button className="btn-secondary" type="button" disabled={index === (state.rundown?.length ?? 0) - 1} aria-label={`Move ${graphic} later`} onClick={() => { const order = [...state.rundown ?? []]; [order[index], order[index + 1]] = [order[index + 1], order[index]]; setState({ ...state, rundown: order }); }}>↓</button><button className="btn-secondary" type="button" aria-label={`Remove ${graphic} from rundown`} onClick={() => setState({ ...state, rundown: state.rundown?.filter(item => item !== graphic) })}>Remove</button></li>)}</ol><button className="btn-secondary mt-3" type="button" disabled={state.rundown?.includes(state.graphic)} onClick={() => setState({ ...state, rundown: [...state.rundown ?? [], state.graphic] })}>Add selected graphic to rundown</button></details>
          <label className="block text-sm">Find a graphic<input className={fieldClass} value={graphicSearch} onChange={event => setGraphicSearch(event.target.value)} placeholder="Schedule, standings, awards…" /></label>
          <label className="block text-sm">
            Graphic
            <select
              className={fieldClass}
              value={state.graphic}
              aria-label="Graphic"
              disabled={busy}
              onChange={(event) => setState({ ...state, graphic: event.target.value as BroadcastState["graphic"], page: 0,
                ...(event.target.value === "team-slots" ? { matchId: "", playerId: "", comparisonPlayerId: "", teamId: "", rosterIds: [], stageId: "", groupId: "", dayId: "", stageLabel: "" } : {}) })}
            >
              {BROADCAST_GRAPHIC_GROUPS.map(group => <optgroup key={group.name} label={group.name}>{group.graphics.filter(graphic => graphic === state.graphic || graphic.replaceAll("-", " ").includes(graphicSearch.toLowerCase())).map((graphic) => (
                <option key={graphic} value={graphic}>
                  {graphic.replaceAll("-", " ")}
                </option>
              ))}</optgroup>)}
            </select>
          </label>
          {["team-stats", "team-spotlight"].includes(state.graphic) && (
            <>
              <label className="block text-sm">
                Team
                <select
                  className={fieldClass}
                  value={state.teamId ?? ""}
                  onChange={(e) => setState({ ...state, teamId: e.target.value, rosterIds: [] })}
                >
                  <option value="">Select team</option>
                  {eventTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Statistics period
                <select
                  className={fieldClass}
                  value={state.statsScope ?? "match"}
                  onChange={(e) => setState({ ...state, statsScope: e.target.value as "match" | "tournament", rosterIds: [] })}
                >
                  <option value="match">Selected match</option>
                  <option value="tournament">Published tournament totals</option>
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm">Select up to four players (otherwise top four)</legend>
                {Array.from(
                  new Map(
                    (state.statsScope === "tournament"
                      ? matches.flatMap((match) => match.playerResults ?? [])
                      : (selectedMatch?.playerResults ?? [])
                    )
                      .filter((player) => player.teamId === state.teamId)
                      .map((player) => [player.playerId, player]),
                  ).values(),
                ).map((player) => (
                  <label key={player.playerId} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={state.rosterIds?.includes(player.playerId) ?? false}
                      disabled={!state.rosterIds?.includes(player.playerId) && (state.rosterIds?.length ?? 0) >= 4}
                      onChange={(e) =>
                        setState({
                          ...state,
                          rosterIds: e.target.checked
                            ? [...(state.rosterIds ?? []), player.playerId]
                            : state.rosterIds?.filter((id) => id !== player.playerId),
                        })
                      }
                    />
                    {player.playerName}
                  </label>
                ))}
              </fieldset>
            </>
          )}
          {["countdown", "map-intro", "todays-matches", "road-to-finals", "road-to-finals-2", "casters"].includes(state.graphic) && (
            <label className="block text-sm">
              Stage label (optional)
              <input
                className={fieldClass}
                maxLength={100}
                value={state.stageLabel ?? ""}
                onChange={(e) => setState({ ...state, stageLabel: e.target.value })}
              />
            </label>
          )}
          {["countdown", "starting-soon"].includes(state.graphic) && (
            <label className="block text-sm">
              Countdown override ({production?.timeZone ?? "Asia/Kathmandu"}, optional)
              <input
                type="datetime-local"
                className={fieldClass}
                value={formatEventDateTimeInput(state.countdownTarget, production?.timeZone ?? "Asia/Kathmandu")}
                onChange={(e) => { const iso = eventDateTimeLocalToUtcIso(e.target.value, production?.timeZone ?? "Asia/Kathmandu"); if (e.target.value && !iso) setError("This time is invalid or ambiguous in the event timezone. Choose another time."); else { setError(""); setState({ ...state, countdownTarget: iso ?? "" }); } }}
              />
              <span className="mt-1 block text-xs text-text-muted">
                Empty uses the next upcoming match in the published competition schedule. Overrides are audited when saved.
              </span>
            </label>
          )}
          {["map-intro", "todays-matches"].includes(state.graphic) && (
            <details>
              <summary className="cursor-pointer text-sm">Approved map artwork</summary>
              <label className="block text-sm">
                Map
                <select className={fieldClass} value={artworkMap} onChange={(e) => setArtworkMap(e.target.value)}>
                  {["Erangel", "Miramar", "Taego", "Rondo", "Vikendi", "Deston", "Sanhok", "Karakin", "Paramo"].map((map) => (
                    <option key={map}>{map}</option>
                  ))}
                </select>
              </label>
              <FileUpload
                key={artworkMap}
                type="media_asset"
                entityId={`broadcast-map-${artworkMap}`}
                label={`${artworkMap} approved artwork`}
                currentUrl={state.mapArtwork?.[artworkMap]}
                onUploaded={(url) => setState({ ...state, mapArtwork: { ...state.mapArtwork, [artworkMap]: url } })}
              />
            </details>
          )}
          {["casters", "analyst-panel"].includes(state.graphic) && (
            <div className="space-y-4">
              {state.casters?.map((caster, index) => (
                <fieldset key={caster.id} className="space-y-2 border-t border-white/10 pt-3">
                  <legend>Caster {index + 1}</legend>
                  <label className="block text-sm">Event assignment<select className={fieldClass} value={caster.eventId ?? ""} onChange={event => setState({ ...state, casters: state.casters?.map(row => row.id === caster.id ? { ...row, eventId: event.target.value, dayId: "" } : row) })}><option value="">Select event</option>{tournaments.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
                  <label className="block text-sm">Day assignment<select className={fieldClass} value={caster.dayId ?? ""} onChange={event => setState({ ...state, casters: state.casters?.map(row => row.id === caster.id ? { ...row, dayId: event.target.value } : row) })}><option value="">All event days</option>{caster.eventId === state.tournamentId && production?.days.filter(day => !day.archived).map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></label>
                  {(["name", "role", "handle", "country"] as const).map((key) => (
                    <label key={key} className="block text-sm">
                      {key}
                      <input
                        className={fieldClass}
                        maxLength={100}
                        value={caster[key] ?? ""}
                        onChange={(e) =>
                          setState({
                            ...state,
                            casters: state.casters?.map((row) => (row.id === caster.id ? { ...row, [key]: e.target.value } : row)),
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className="block text-sm">Display order<input type="number" className={fieldClass} min={0} max={100} value={caster.order ?? index} onChange={event => setState({ ...state, casters: state.casters?.map(row => row.id === caster.id ? { ...row, order: Number(event.target.value) } : row) })} /></label>
                  <FileUpload
                    type="media_asset"
                    entityId={`broadcast-caster-${caster.id}`}
                    label="Caster portrait"
                    currentUrl={caster.portraitUrl}
                    onUploaded={(url) =>
                      setState({
                        ...state,
                        casters: state.casters?.map((row) => (row.id === caster.id ? { ...row, portraitUrl: url } : row)),
                      })
                    }
                  />
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={caster.published}
                      onChange={(e) =>
                        setState({
                          ...state,
                          casters: state.casters?.map((row) => (row.id === caster.id ? { ...row, published: e.target.checked } : row)),
                        })
                      }
                    />
                    Approved for public broadcast
                  </label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setState({ ...state, casters: state.casters?.filter((row) => row.id !== caster.id) })}
                  >
                    Remove caster {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="btn-secondary"
                disabled={(state.casters?.length ?? 0) >= 4}
                onClick={() =>
                  setState({
                    ...state,
                    casters: [
                      ...(state.casters ?? []),
                      { id: crypto.randomUUID(), name: "", role: "", handle: "", portraitUrl: "", published: false, eventId: state.tournamentId, dayId: state.dayId ?? "", country: "", order: state.casters?.length ?? 0 },
                    ],
                  })
                }
              >
                Add caster
              </button>
              <p className="text-xs text-text-muted">Publish two to four profiles. Unapproved profiles stay private.</p>
            </div>
          )}
          {["scoreboard", "results", "rankings", "standings", "group-standings", "day-standings", "final-rankings", "compact-scoreboard", "advancement"].includes(state.graphic) && (
            <label className="block text-sm">
              Scoreboard page ({state.templates?.[state.graphic]?.rows ?? 24} teams per page)
              <input
                className={fieldClass}
                type="number"
                min={1}
                max={100}
                value={(state.page ?? 0) + 1}
                disabled={busy}
                onChange={(event) => setState({ ...state, page: Math.max(0, Number(event.target.value) - 1) })}
              />
            </label>
          )}
          {["players", "player-comparison", "lower-third"].includes(state.graphic) && (
            <label className="block text-sm">
              Player
              <select
                className={fieldClass}
                value={state.playerId}
                disabled={busy}
                onChange={(event) => setState({ ...state, playerId: event.target.value })}
              >
                <option value="">Select player</option>
                {selectedMatch?.playerResults?.map((player) => (
                  <option key={player.playerId} value={player.playerId}>
                    {player.playerName} · {player.teamName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {state.graphic === "player-comparison" && <label className="block text-sm">Compare with<select className={fieldClass} value={state.comparisonPlayerId ?? ""} onChange={event => setState({ ...state, comparisonPlayerId: event.target.value })}><option value="">Select second player</option>{selectedMatch?.playerResults?.filter(player => player.playerId !== state.playerId).map(player => <option key={player.playerId} value={player.playerId}>{player.playerName} · {player.teamName}</option>)}</select></label>}
          {state.graphic === "lower-third" && (
            <>
              <label className="block text-sm">
                Title
                <input
                  className={fieldClass}
                  maxLength={100}
                  value={state.lowerTitle}
                  onChange={(event) => setState({ ...state, lowerTitle: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                Subtitle
                <input
                  className={fieldClass}
                  maxLength={180}
                  value={state.lowerSubtitle}
                  onChange={(event) => setState({ ...state, lowerSubtitle: event.target.value })}
                />
              </label>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <h3 className="col-span-2 font-bold">D. Broadcast controls</h3>
            <button disabled={busy || !state.tournamentId || ["mvp", "winner"].includes(state.graphic) || readySignature !== studioSignature(parseBroadcastState(state))} className="btn-primary" onClick={() => void update({ visible: true })}>
              Show graphic
            </button>
            <button disabled={busy} className="btn-secondary" onClick={() => void update({ visible: false }, false, program)}>
              Hide graphic
            </button>
            <button disabled={busy} className="btn-secondary" onClick={() => void update({ visible: false })}>
              Save & preview
            </button>
            <button disabled={busy} className="btn-secondary" onClick={() => void update({}, false, state, "ready")}>Mark ready</button>
            <button disabled={busy} className="btn-secondary" onClick={() => void update({}, false, state, "restore")}>Restore previous graphic</button>
            <button disabled={busy} className="btn-secondary" onClick={() => void load()}>
              Reload controls
            </button>
          </div>
          {["road-to-finals", "road-to-finals-2", "todays-matches", "team-slots"].includes(state.graphic) && (
            <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={busy} className="btn-secondary" onClick={() => void update(state.graphic.startsWith("road-to-finals") ? { graphic: state.graphic === "road-to-finals" ? "road-to-finals-2" : "road-to-finals", page: 0 } : { page: Math.max(0, (state.page ?? 0) - 1) })}>Preview previous page</button>
            <button
              type="button"
              disabled={busy}
              className="btn-secondary w-full"
              onClick={() =>
                void update(
                  state.graphic.startsWith("road-to-finals")
                    ? { graphic: state.graphic === "road-to-finals" ? "road-to-finals-2" : "road-to-finals", page: 0 }
                    : {
                        page: ((state.page ?? 0) + 1) % Math.max(1, Math.ceil(state.graphic === "team-slots"
                          ? (scrims.find(scrim => scrim.id === state.scrimId)?.teamCapacity ?? 0) / (state.templates?.[state.graphic]?.rows ?? 16)
                          : scheduleCount / Math.min(6, state.templates?.[state.graphic]?.rows ?? 5))),
                      },
                )
              }
            >
              Preview next page
            </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy || !selectedMatch}
              className="btn-secondary"
              onClick={() => void update({ graphic: "mvp", visible: true }, true)}
            >
              Reveal MVP
            </button>
            <button
              disabled={busy || !selectedMatch}
              className="btn-secondary"
              onClick={() => void update({ graphic: "winner", visible: true }, true)}
            >
              Reveal winner
            </button>
          </div>
          <button disabled={busy} className="btn-secondary w-full" onClick={() => void update({}, false, program)}>
            Refresh overlay data
          </button>
          <p className="text-xs text-text-muted">
            Save selection changes before previewing. These controls update browser graphics; they do not switch OBS scenes.
          </p>
        </div>
        <div className="min-w-0 space-y-4">
          <p className="text-sm text-text-muted">Next graphic: {studioStatus}. Preview is private; Take Live requires this exact selection to be marked ready.</p>
          <p className="rounded border border-white/15 p-3 text-sm">Current program: {program?.graphic.replaceAll("-", " ") ?? "None"} · {tournaments.find(event => event.id === program?.tournamentId)?.title ?? "No event"} · {program?.visible ? "On air" : "Hidden"}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">C. Edit and preview</h3>
            <a className="btn-secondary" href="/overlay/program?studio=1" target="_blank" rel="noreferrer">
              Full-screen preview
            </a>
          </div>
          <BroadcastTemplateEditor state={state} onChange={setState} production={production} />
          <div
            ref={previewRef}
            className="relative aspect-video overflow-hidden rounded-md border border-white/15 bg-[#263344]"
            style={{ backgroundImage: "repeating-conic-gradient(#263344 0% 25%, #1a2635 0% 50%)", backgroundSize: "24px 24px" }}
          >
            <iframe
              ref={previewFrameRef}
              onLoad={sendPresentation}
              key={previewKey}
              title="Published graphic preview"
              src="/overlay/program?studio=1"
              width={1920}
              height={1080}
              className="absolute left-0 top-0 border-0"
              style={{ transform: `scale(${scale})`, transformOrigin: "top left", maxWidth: "none" }}
            />
          </div>
          <div className="esports-card space-y-3 p-5">
            <h3 className="font-semibold">OBS Browser Source</h3>
            <p className="text-sm text-text-muted">1920 × 1080 · transparent background · keep the source active to receive controls.</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => void copyUrl("program")}>
                Copy program URL
              </button>
              <button className="btn-secondary" onClick={() => void copyUrl(state.graphic)}>
                Copy this graphic URL
              </button>
            </div>
            <code className="block break-all text-sm text-cyan-200">/overlay/program</code>
            <code className="block break-all text-sm text-text-muted">/overlay/{state.graphic}</code>
            <p className="text-xs text-text-muted">
              Program follows the graphic taken live. Dedicated URLs render only when that graphic is selected and shown. Private preview can include draft records; OBS receives only published records.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
