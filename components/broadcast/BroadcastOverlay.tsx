"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { broadcastLabel, defaultBroadcastTemplate, parseBroadcastTemplate, type BroadcastTemplate } from "@/lib/broadcast-template";
import Asset from "./BroadcastAsset";
import BroadcastScenes, { FULL_SCENE_GRAPHICS, type BroadcastClock } from "./BroadcastScenes";
import BroadcastExtendedGraphic, { EXTENDED_GRAPHICS } from "./BroadcastExtendedGraphic";
import type { BroadcastGraphic, BroadcastSnapshot } from "@/lib/broadcast";
import { isBroadcastGraphic } from "@/lib/broadcast";
import "./broadcast.css";

function Graphic({ graphic, data, clock }: { graphic: BroadcastGraphic; data: BroadcastSnapshot; clock: BroadcastClock }) {
  if (FULL_SCENE_GRAPHICS.includes(graphic)) return <BroadcastScenes graphic={graphic} data={data} clock={clock} />;
  if (EXTENDED_GRAPHICS.includes(graphic)) return <BroadcastExtendedGraphic graphic={graphic} data={data} clock={clock} />;
  const template = data.control.presentation ?? defaultBroadcastTemplate(graphic);
  const show = (column: string) => !template.hiddenColumns.includes(column);
  const eventName = template.tournamentTitle || data.tournament?.title || "Bravo Gaming Esports";
  const matchLabel = data.match ? `Match ${data.match.matchNumber ?? "—"} · ${data.match.map}` : "Select a published match";
  const header = (title: string) => (
    <header className="broadcast-heading">
      <span>
        <Asset url={template.logoUrl || data.tournament?.logoUrl || "/images/bravo-logo-mark.webp"} name={eventName} /> {eventName}
      </span>
      <h1>{template.title || title}</h1>
      <p>{template.subtitle || `${eventName} · ${template.matchLabel || matchLabel}`}</p>
    </header>
  );
  const empty = (message: string) => <p className="broadcast-empty">{message}</p>;

  if (["scoreboard", "results", "rankings", "standings", "group-standings", "day-standings", "final-rankings"].includes(graphic)) {
    const overall = !["scoreboard", "results"].includes(graphic);
    const validContext =
      graphic === "group-standings"
        ? data.control.scope?.group
        : graphic === "day-standings"
          ? data.control.scope?.day
          : graphic === "final-rankings"
            ? data.finalResults
            : true;
    const rows = validContext ? (overall ? data.standings : data.results) : [];
    const rowsPerPage = template.rows;
    const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    const page = Math.min(data.control.page ?? 0, pageCount - 1);
    return (
      <section className="broadcast-panel broadcast-board">
        {header(
          graphic === "group-standings"
            ? "Group standings"
            : graphic === "day-standings"
              ? "Day standings"
              : graphic === "final-rankings"
                ? "Final rankings"
                : overall
                  ? "Tournament standings"
                  : "Match results",
        )}
        {rows.length ? (
          <table aria-label="Broadcast standings and match results">
            <thead>
              <tr>
                <th scope="col">{broadcastLabel(template, "rank")}</th>
                <th scope="col">{broadcastLabel(template, "team")}</th>
                {(!overall || show("matches")) && <th scope="col">{broadcastLabel(template, overall ? "matches" : "placement")}</th>}
                {overall && show("wins") && <th scope="col">{broadcastLabel(template, "wins")}</th>}
                {show("kills") && <th scope="col">{broadcastLabel(template, "kills")}</th>}
                {show("killPoints") && <th scope="col">{broadcastLabel(template, "killPoints")}</th>}
                {show("placementPoints") && <th scope="col">{broadcastLabel(template, "placementPoints")}</th>}
                <th scope="col">{broadcastLabel(template, "totalPoints")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
                <tr key={row.teamId ?? row.teamName}>
                  <td>{row.rank.toString().padStart(2, "0")}</td>
                  <td>
                    <div className="broadcast-team">
                      <Asset url={row.logoUrl} name={row.teamName} />
                      <span>{row.teamName}</span>
                    </div>
                  </td>
                  {(!overall || show("matches")) && <td>{"matches" in row ? row.matches : row.placement}</td>}
                  {overall && show("wins") && <td>{"wins" in row ? row.wins : "—"}</td>}
                  {show("kills") && <td>{row.kills}</td>}
                  {show("killPoints") && <td>{row.killPoints}</td>}
                  {show("placementPoints") && <td>{row.placementPoints}</td>}
                  <td className="broadcast-points">{row.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          empty(
            !validContext
              ? "Select the required group/day context, or complete and publish the full event for final rankings."
              : "No published results available.",
          )
        )}
        <footer>
          Published results · {data.match?.pointSystemName ?? "Configured event scoring"}
          {pageCount > 1 ? ` · Page ${page + 1} of ${pageCount}` : ""}
          {!overall && data.match
            ? ` · ${data.match.dataSource === "pubg_api" ? "PUBG API import" : data.match.dataSource === "external_feed" ? "External import" : "Manually entered / corrected"}`
            : ""}
        </footer>
      </section>
    );
  }
  if (graphic === "winner")
    return (
      <section className="broadcast-panel broadcast-reveal">
        {header("Winner winner. Chicken dinner.")}
        {data.winner ? (
          <>
            <Asset url={data.winner.logoUrl} name={data.winner.teamName} />
            <h2>{data.winner.teamName}</h2>
            <p>{data.winner.kills} kills · Match winner</p>
          </>
        ) : (
          empty("A verified first-place result is not available.")
        )}
      </section>
    );
  if (["mvp", "top-fragger", "top-damage", "players"].includes(graphic)) {
    const player =
      graphic === "top-damage"
        ? data.topDamage
        : graphic === "players"
          ? data.selectedPlayer
          : graphic === "top-fragger"
            ? data.topFragger
            : data.mvp;
    const title =
      graphic === "mvp"
        ? "Match MVP"
        : graphic === "top-fragger"
          ? "Top fragger"
          : graphic === "top-damage"
            ? "Most damage"
            : "Player spotlight";
    return (
      <section className="broadcast-panel broadcast-player">
        {header(title)}
        {player ? (
          <>
            <Asset url={player.avatarUrl} name={player.playerName} />
            <h2>{player.playerName}</h2>
            <p>{player.teamName}</p>
            {graphic === "mvp" && <Asset url={player.teamLogoUrl} name={player.teamName} />}
            <div className="broadcast-metrics">
              {(["kills", "damage", "assists", "knocks", "survivalTime"] as const).filter(key => !template.hiddenStats?.includes(key)).map(key => <div key={key}><strong>{key === "damage" ? Math.round(player[key]).toLocaleString("en-US") : player[key]}</strong><span>{broadcastLabel(template, key)}</span></div>)}
            </div>
            {graphic === "mvp" && <footer>MVP: kills, then damage, then assists</footer>}
            {graphic === "mvp" && (
              <p>
                Survival: {Math.floor(player.survivalTime / 60)}m {Math.floor(player.survivalTime % 60)}s
              </p>
            )}
          </>
        ) : (
          empty(graphic === "players" ? "Select a player in Broadcast Control." : "No published player statistics available.")
        )}
      </section>
    );
  }
  if (graphic === "lower-third")
    return (
      <section className="broadcast-panel broadcast-lower">
        <span>BRAVO GAMING</span>
        <h1>{template.title || data.control.lowerTitle || data.selectedPlayer?.playerName || eventName}</h1>
        <p>{template.subtitle || data.control.lowerSubtitle || data.selectedPlayer?.teamName || matchLabel}</p>
      </section>
    );
  if (graphic === "sponsors")
    return (
      <section className="broadcast-panel broadcast-sponsors">
        {header("Our tournament partners")}
        <div>
          {template.showSponsors && data.sponsors.map((sponsor) => (
            <article key={sponsor.id}>
              <Asset url={sponsor.logoUrl} name={sponsor.name} />
              <h2>{sponsor.name}</h2>
            </article>
          ))}
        </div>
        {!data.sponsors.length && empty("No published sponsors assigned to this tournament.")}
      </section>
    );
  if (graphic === "headshots" || graphic === "killfeed")
    return (
      <section className="broadcast-panel broadcast-unavailable">
        {header(graphic === "headshots" ? "Headshot leader" : "Elimination feed")}
        {empty(
          graphic === "headshots"
            ? "Verified headshot statistics are not available for this match."
            : "No reliable live elimination event source is connected.",
        )}
      </section>
    );
  if (graphic === "schedule")
    return (
      <section className="broadcast-panel broadcast-schedule">
        {header("Tournament schedule")}
        <h2>{eventName}</h2>
        <p>
          {data.schedule?.startDate
            ? new Date(data.schedule.startDate).toLocaleString("en-GB", { timeZone: data.timeZone }) + ` (${data.timeZone})`
            : "Dates not published"}
        </p>
        <ol>
          {data.schedule?.mapRotation.map((map, index) => (
            <li key={`${index}-${map}`}>
              <span>Map {index + 1}</span>
              <strong>{map}</strong>
            </li>
          ))}
        </ol>
        <footer>Published event dates and map rotation · not a live lobby feed</footer>
      </section>
    );
  return (
    <section className="broadcast-panel broadcast-title">
      {header(graphic === "opening" ? "Welcome to the battleground" : "Thank you for watching")}
      <h2>{eventName}</h2>
      <p>{graphic === "opening" ? "PUBG PC · Bravo Gaming Esports" : "See you at the next drop."}</p>
      <div className="broadcast-brand">
        BRAVO<span>GAMING ESPORTS</span>
      </div>
    </section>
  );
}

export default function BroadcastOverlay({
  graphic,
  preview = false,
  studio = false,
}: {
  graphic: BroadcastGraphic | "program";
  preview?: boolean;
  studio?: boolean;
}) {
  const [data, setData] = useState<BroadcastSnapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [clock, setClock] = useState<BroadcastClock>({ epoch: 0, performance: 0 });
  const [localPresentation, setLocalPresentation] = useState<{
    graphic: BroadcastGraphic;
    presentation: BroadcastTemplate;
    lowerTitle: string;
    lowerSubtitle: string;
  } | null>(null);
  useEffect(() => {
    if (!studio) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "bravo:studio:presentation")
        return;
      try {
        const value = event.data;
        if (
          !isBroadcastGraphic(value.graphic) ||
          typeof value.lowerTitle !== "string" ||
          value.lowerTitle.length > 100 ||
          typeof value.lowerSubtitle !== "string" ||
          value.lowerSubtitle.length > 180
        )
          return;
        setLocalPresentation({
          graphic: value.graphic,
          presentation: parseBroadcastTemplate(value.presentation),
          lowerTitle: value.lowerTitle,
          lowerSubtitle: value.lowerSubtitle,
        });
      } catch {
        /* Invalid private editor messages never alter the rendered snapshot. */
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [studio]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let etag = "";
    let failures = 0;
    let activeRequest: AbortController | undefined;
    async function poll() {
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(studio ? "/api/admin/broadcast?preview=1" : "/api/broadcast", {
          headers: etag ? { "If-None-Match": etag } : {},
          cache: "no-store",
          signal: controller.signal,
        });
        const serverTime = Number(response.headers.get("x-broadcast-time"));
        if (!stopped) setClock({ epoch: serverTime > 0 ? serverTime : Date.now(), performance: performance.now() });
        if (response.status !== 304) {
          if (!response.ok) throw new Error("Broadcast unavailable");
          const payload = await response.json();
          if (!payload.success || !payload.data) throw new Error("Invalid broadcast response");
          if (!stopped) setData(payload.data);
          etag = response.headers.get("etag") ?? "";
        }
        failures = 0;
        if (!stopped) setUnavailable(false);
      } catch {
        failures += 1;
        // Hide stale graphics after an outage rather than showing withdrawn results.
        if (!stopped) {
          setUnavailable(true);
          setData(null);
          etag = "";
        }
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(poll, Math.min(30_000, 3000 * 2 ** Math.min(failures, 4)));
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      activeRequest?.abort();
    };
  }, [studio]);
  const selected = graphic === "program" ? data?.control.graphic : graphic;
  const editable = studio && localPresentation?.graphic === selected ? localPresentation : null;
  const presentation =
    editable?.presentation ??
    (data && selected === data.control.graphic
      ? (data.control.presentation ?? defaultBroadcastTemplate(selected ?? ""))
      : defaultBroadcastTemplate(selected ?? ""));
  const visible = data && (studio || preview || (data.control.visible && (graphic === "program" || graphic === data.control.graphic)));
  return (
    <main className="broadcast-stage" aria-label="Bravo broadcast graphic" data-connected={!unavailable}>
      {visible && selected && (
        <div
          className={`broadcast-content graphic-${selected} layout-${presentation.layout} font-${presentation.font} align-${presentation.alignment} sponsors-${presentation.sponsorPosition} ${presentation.showSponsors ? "" : "hide-sponsors"}`}
          key={`${selected}-${data.control.revealId}`}
          style={
            {
              "--broadcast-accent": presentation.accent,
              "--safe-margin": `${presentation.safeMargin}px`,
              "--brand-size": `${presentation.logoSize}px`,
              "--portrait-position": `${presentation.portraitX}% ${presentation.portraitY}%`,
              "--background-position": `${presentation.backgroundX}% ${presentation.backgroundY}%`,
              "--scene-background-image": presentation.backgroundUrl ? `url(${JSON.stringify(presentation.backgroundUrl)})` : "none",
              animationDuration: `${presentation.duration}ms`,
              ...(presentation.animation === "none" ? { animation: "none" } : {}),
            } as CSSProperties
          }
        >
          <Graphic
            graphic={selected}
            data={
              editable
                ? {
                    ...data,
                    control: { ...data.control, presentation, lowerTitle: editable.lowerTitle, lowerSubtitle: editable.lowerSubtitle },
                  }
                : data
            }
            clock={clock}
          />
        </div>
      )}
      {preview && !data && (
        <p className="broadcast-preview-status">
          {unavailable ? "Broadcast data unavailable. Check the connection." : "Loading published broadcast data…"}
        </p>
      )}
    </main>
  );
}
