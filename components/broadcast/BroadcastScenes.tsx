"use client";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import type { BroadcastGraphic, BroadcastSnapshot } from "@/lib/broadcast";
import { broadcastLabel, defaultBroadcastTemplate } from "@/lib/broadcast-template";
import { scheduleForDay } from "@/lib/event-schedule";
import Asset from "./BroadcastAsset";
import BroadcastSponsorStrip from "./BroadcastSponsorStrip";

export const FULL_SCENE_GRAPHICS = [
  "road-to-finals",
  "road-to-finals-2",
  "todays-matches",
  "map-intro",
  "countdown",
  "casters",
  "team-stats",
  "mvp",
  "break",
  "starting-soon",
  "analyst-panel",
  "technical-break",
];
export type BroadcastClock = { epoch: number; performance: number };
function Countdown({ target, clock }: { target?: string; clock: BroadcastClock }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(performance.now() - clock.performance), 250);
    return () => clearInterval(timer);
  }, [clock]);
  if (!target || !Number.isFinite(Date.parse(target))) return <strong className="scene-clock">Time to be announced</strong>;
  const seconds = Math.max(0, Math.ceil((Date.parse(target) - clock.epoch - elapsed) / 1000));
  return (
    <strong className="scene-clock" aria-label="Countdown">
      {String(Math.floor(seconds / 3600)).padStart(2, "0")}:{String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
    </strong>
  );
}
function time(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
export default function BroadcastScenes({
  graphic: requestedGraphic,
  data,
  clock,
}: {
  graphic: BroadcastGraphic;
  data: BroadcastSnapshot;
  clock: BroadcastClock;
}) {
  const graphic =
    requestedGraphic === "starting-soon"
      ? "countdown"
      : requestedGraphic === "analyst-panel"
        ? "casters"
        : requestedGraphic === "technical-break"
          ? "break"
          : requestedGraphic;
  const settings = data.control.presentation ?? defaultBroadcastTemplate(requestedGraphic);
  const next = data.scheduledMatches?.find((row) => ["upcoming", "scheduled", "lobby-open"].includes(row.status));
  const schedule = scheduleForDay(data.scheduledMatches ?? [], data.timeZone ?? "Asia/Kathmandu", clock.epoch);
  const scheduleSize = Math.min(6, settings.rows);
  const title =
    settings.title ||
    (requestedGraphic === "starting-soon"
      ? "Starting Soon"
      : requestedGraphic === "analyst-panel"
        ? "Analyst Panel"
        : requestedGraphic === "technical-break"
          ? "Technical Break"
          : graphic.startsWith("road-to-finals")
            ? "Road to Finals"
            : graphic === "todays-matches"
              ? "Today’s Matches"
              : graphic === "map-intro"
                ? `Match ${String(data.match?.matchNumber ?? next?.matchNumber ?? "—").padStart(2, "0")} — Map Overview`
                : graphic === "countdown"
                  ? "Next Pre-show"
                  : graphic === "casters"
                    ? "Caster & Analyst Desk"
                    : graphic === "team-stats"
                      ? "Team Statistics"
                      : graphic === "mvp"
                        ? "Man of the Match"
                        : "We’ll Be Right Back");
  const eventName = settings.tournamentTitle || data.tournament?.title || "Bravo Gaming Esports";
  const stage = [data.control.stageLabel, settings.dayLabel, settings.matchLabel].filter(Boolean).join(" · ");
  const sponsorFooter = settings.showSponsors ? <BroadcastSponsorStrip sponsors={data.sponsors} clock={clock} /> : null;
  function board(rows: BroadcastSnapshot["standings"], leader = false) {
    const columns = (
      [
        ["matches", broadcastLabel(settings, "matches")],
        ["placementPoints", broadcastLabel(settings, "placementPoints")],
        ["killPoints", broadcastLabel(settings, "killPoints")],
        ["totalPoints", broadcastLabel(settings, "totalPoints")],
      ] as const
    ).filter(([key]) => !settings.hiddenColumns.includes(key));
    return (
      <table className={`scene-standings ${leader ? "scene-leader-table" : ""}`} aria-label="Road to Finals standings">
        <thead>
          <tr>
            <th scope="col">{broadcastLabel(settings, "rank")} / {broadcastLabel(settings, "team")}</th>
            {columns.map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.teamId} className={leader && index === 0 ? "scene-leading-row" : ""}>
              {leader && index === 0 ? (
                <td colSpan={columns.length + 1}>
                  <div className="scene-leader-hero">
                    <div className="scene-leader-portraits">
                      {data.leaderRoster?.length ? (
                        data.leaderRoster.map((player) => <Asset key={player.id} url={player.avatarUrl} name={player.name} />)
                      ) : (
                        <Asset url={row.logoUrl} name={row.teamName} />
                      )}
                    </div>
                    <div className="scene-hero-caption">
                      <strong>#{row.rank}</strong>
                      <span>{row.teamName}</span>
                      <strong>{row.totalPoints} PTS</strong>
                    </div>
                  </div>
                </td>
              ) : (
                <>
                  <td>
                    <div className="scene-rank-team">
                      <strong>#{row.rank}</strong>
                      <Asset url={row.logoUrl} name={row.teamName} />
                      <span>{row.teamName}</span>
                    </div>
                  </td>
                  {columns.map(([key]) => (
                    <td key={key}>{row[key]}</td>
                  ))}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const roadRows = Math.min(12, settings.rows);
  const roadStart = (graphic === "road-to-finals-2" ? 12 : 0) + (data.control.page ?? 0) * roadRows;
  const road = data.standings.slice(roadStart, Math.min(graphic === "road-to-finals-2" ? 24 : 12, roadStart + roadRows));
  const map = data.match?.mapLabel || data.match?.map || next?.mapLabel || next?.map;
  const mapArt = data.mapArtworkUrl || next?.artworkUrl;
  const team = data.selectedTeam;
  const mvp = data.mvp;
  const teamMetrics = (["knocks", "damage", "kills", "assists", "survivalTime"] as const).filter(key => !settings.hiddenStats?.includes(key));
  const mvpMetrics = (["kills", "damage", "survivalTime", "knocks", "assists"] as const).filter(key => !settings.hiddenStats?.includes(key));
  return (
    <section className={`broadcast-scene scene-mode-${graphic}`} aria-label={title}>
      <header className="scene-header">
        <div>
          <h1 title={title}>{title}</h1>
          <p>{settings.subtitle || [eventName, stage].filter(Boolean).join(" · ")}</p>
        </div>
        <Asset url={settings.logoUrl || data.tournament?.logoUrl || "/images/bravo-logo.png"} name={eventName} />
      </header>
      {graphic.startsWith("road-to-finals") ? (
        <div className={`scene-ranking-columns ${graphic === "road-to-finals" ? "scene-first-ranks" : ""}`}>
          {road.length ? (
            <>
              {board(road.slice(0, graphic === "road-to-finals" ? 4 : 6), graphic === "road-to-finals")}
              {board(road.slice(graphic === "road-to-finals" ? 4 : 6))}
            </>
          ) : (
            <p className="scene-unavailable">No published teams in this ranking range.</p>
          )}
        </div>
      ) : null}
      {graphic === "todays-matches" ? (
        <>
          <div
            className="scene-schedule"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(scheduleSize, schedule.length))}, minmax(0,1fr))` }}
          >
            {schedule.slice((data.control.page ?? 0) * scheduleSize, ((data.control.page ?? 0) + 1) * scheduleSize).map((row) => (
              <article key={row.matchNumber}>
                <div className="scene-schedule-time">
                  <small>Match {String(row.matchNumber).padStart(2, "0")}</small>
                  <strong>{time(row.scheduledAt, data.timeZone ?? "Asia/Kathmandu")}</strong>
                  <span>{data.timeZone ?? "Asia/Kathmandu"}</span>
                </div>
                <div className="scene-map-tile">
                  <Asset url={row.artworkUrl} name={row.map} />
                </div>
                <h2>{row.map}</h2>
                <span className="scene-match-status">{row.status.replaceAll("-", " ")}</span>
              </article>
            ))}
          </div>
          {!schedule.length ? <p className="scene-unavailable">No published match schedule is available for today.</p> : null}
        </>
      ) : null}
      {graphic === "map-intro" ? (
        <div className="scene-map-intro">
          <aside>
            <Image src={settings.logoUrl || "/images/bravo-logo.png"} alt="Bravo Gaming Esports" width={140} height={100} unoptimized />
            <p className="scene-match-banner">
              {data.control.stageLabel || eventName}
              <strong>Match {data.match?.matchNumber ?? next?.matchNumber ?? "—"}</strong>
            </p>
            <h2>{map || "Map to be announced"}</h2>
            <p>
              {data.match
                ? data.match.status === "published"
                  ? "Results published"
                  : "Result preview"
                : next?.status.replaceAll("-", " ") || "Awaiting schedule"}
            </p>
            <p>{data.registeredTeams?.length ?? 0} registered teams</p>
            <small>Approved map artwork. Live flight paths, positions and zone telemetry are unavailable.</small>
          </aside>
          <div className="scene-map-art">
            <Asset url={mapArt} name={map || "Map artwork"} />
            {data.mapAnnotationsUrl ? (
              <Image
                className="scene-approved-annotations"
                src={data.mapAnnotationsUrl}
                alt="Approved static map annotations"
                width={1200}
                height={700}
                unoptimized
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {graphic === "countdown" ? (
        <div className="scene-preshow">
          <div className="scene-preshow-main">
            <div className="scene-upcoming-art">
              <Asset url={next?.artworkUrl || mapArt} name={next?.map || "Upcoming match"} />
              <p>{next ? `Match ${next.matchNumber} · ${next.map}` : "Upcoming match to be announced"}</p>
            </div>
            <div className="scene-countdown">
              <div>
                <h2>{broadcastLabel(settings, "resumingIn")}</h2>
                <p>
                  {next
                    ? `${time(next.scheduledAt, data.timeZone ?? "Asia/Kathmandu")} · ${data.timeZone}`
                    : "Awaiting the published schedule"}
                </p>
              </div>
              <Countdown target={data.control.countdownTarget || next?.scheduledAt} clock={clock} />
            </div>
          </div>
          <aside>
            <h2>{broadcastLabel(settings, "upcomingMatch")}</h2>
            <p>{data.control.stageLabel || eventName}</p>
            <div className="scene-team-grid">
              {data.registeredTeams?.slice((data.control.page ?? 0) * 24, ((data.control.page ?? 0) + 1) * 24).map((row) => (
                <div key={row.id}>
                  <Asset url={row.logoUrl} name={row.name} />
                  <span>{row.name}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
      {graphic === "casters" ? (
        <div className="scene-casters">
          {data.casters?.length >= 2 ? (
            data.casters.map((caster) => (
              <article key={caster.id}>
                <Asset url={caster.portraitUrl} name={caster.name} />
                <div>
                  <h2>{caster.name}</h2>
                  <p>{caster.role}</p>
                  <small>{caster.handle}</small>
                </div>
              </article>
            ))
          ) : (
            <p className="scene-unavailable">Publish two to four caster profiles in Broadcast Studio.</p>
          )}
        </div>
      ) : null}
      {graphic === "team-stats" ? (
        team ? (
          <div className="scene-team-statistics" style={{ "--team-stat-count": Math.max(1, teamMetrics.length) } as CSSProperties}>
            <aside>
              <Asset url={team.logoUrl} name={team.name} />
              <h2>{team.name}</h2>
              <p>{team.scope === "tournament" ? "Published tournament totals" : `Match ${data.match?.matchNumber ?? "—"} statistics`}</p>
              <dl>
                {teamMetrics.map(key => <dt key={key}>{broadcastLabel(settings, key)}</dt>)}
              </dl>
            </aside>
            <div className="scene-roster">
              {team.players.map((player) => (
                <article key={player.playerId}>
                  <div className="scene-player-photo">
                    {!settings.hiddenStats?.includes("kills") && <strong>{player.kills} <small>{broadcastLabel(settings, "kills")}</small></strong>}
                    <Asset url={player.avatarUrl} name={player.playerName} />
                  </div>
                  <h3>{player.playerName}</h3>
                  <dl>
                    {teamMetrics.map(key => (
                      <div key={key}>
                        <dt className="sr-only">{broadcastLabel(settings, key)}</dt>
                        <dd>{key === "damage" ? Math.round(player[key]) : player[key]}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
            {!team.players.length ? (
              <p className="scene-unavailable">No published player statistics for this team in the selected period.</p>
            ) : null}
          </div>
        ) : (
          <p className="scene-unavailable">Select a team in Broadcast Studio.</p>
        )
      ) : null}
      {graphic === "mvp" ? (
        mvp ? (
          <div className="scene-mvp">
            <div>
              <div className="scene-mvp-name">
                <Asset url={mvp.teamLogoUrl} name={mvp.teamName} />
                <h2>
                  {mvp.teamName} · {mvp.playerName}
                </h2>
              </div>
              <h3>{broadcastLabel(settings, "matchPerformance")}</h3>
              <dl style={{ "--mvp-count": Math.max(1, mvpMetrics.length) } as CSSProperties}>
                {mvpMetrics.map(key => (
                  <div key={key}>
                    <dt>{broadcastLabel(settings, key)}</dt>
                    <span className="scene-stat-bar" aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.min(100, mvp[key] / (data.mvpScales?.[key] || Math.max(1, mvp[key])) * 100)}%`,
                        }}
                      />
                    </span>
                    <dd>{key === "survivalTime" ? `${Math.floor(mvp[key] / 60)}:${String(Math.floor(mvp[key] % 60)).padStart(2, "0")}` : key === "damage" ? Math.round(mvp[key]) : mvp[key]}</dd>
                  </div>
                ))}
              </dl>
              <p className="scene-mvp-rule">
                MVP: {data.mvpRule || "kills, then damage, then assists"} · bars relative to this match
              </p>
            </div>
            <article>
              <Asset url={mvp.avatarUrl} name={mvp.playerName} />
              <h2>{broadcastLabel(settings, "matchMvp")}</h2>
            </article>
          </div>
        ) : (
          <p className="scene-unavailable">No published player statistics available.</p>
        )
      ) : null}
      {graphic === "break" ? (
        <div className="scene-break">
          <h2>{settings.subtitle || "Stay in the fight."}</h2>
          <p>{data.control.lowerSubtitle || broadcastLabel(settings, "returnMessage")}</p>
        </div>
      ) : null}
      {sponsorFooter}
    </section>
  );
}
