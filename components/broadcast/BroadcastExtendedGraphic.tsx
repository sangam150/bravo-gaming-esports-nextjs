"use client";
import type { BroadcastGraphic, BroadcastSnapshot } from "@/lib/broadcast";
import { broadcastLabel, defaultBroadcastTemplate } from "@/lib/broadcast-template";
import type { BroadcastClock } from "./BroadcastScenes";
import BroadcastSponsorStrip from "./BroadcastSponsorStrip";
import Asset from "./BroadcastAsset";

export const EXTENDED_GRAPHICS: BroadcastGraphic[] = [
  "compact-scoreboard",
  "match-info",
  "team-spotlight",
  "sponsor-strip",
  "champion",
  "player-comparison",
  "advancement",
];
export default function BroadcastExtendedGraphic({
  graphic,
  data,
  clock,
}: {
  graphic: BroadcastGraphic;
  data: BroadcastSnapshot;
  clock: BroadcastClock;
}) {
  const settings = data.control.presentation ?? defaultBroadcastTemplate(graphic);
  const eventName = settings.tournamentTitle || data.tournament?.title || "Bravo Gaming Esports";
  const title =
    settings.title ||
    (
      {
        "compact-scoreboard": "Published standings",
        "match-info": "Match information",
        "team-spotlight": "Team spotlight",
        "sponsor-strip": "Broadcast partners",
        champion: "Tournament champion",
        "player-comparison": "Player comparison",
        advancement: data.advancement?.final ? "Qualified teams" : "Advancement positions",
      } as Partial<Record<BroadcastGraphic, string>>
    )[graphic] ||
    "Bravo Gaming";
  const empty = (message: string) => <p className="scene-unavailable">{message}</p>;
  const logo = settings.logoUrl || data.tournament?.logoUrl || "/images/bravo-logo.png";
  if (graphic === "sponsor-strip")
    return (
      <section className="broadcast-panel broadcast-strip-canvas" aria-label={title}>
        {settings.showSponsors && data.sponsors.length ? (
          <BroadcastSponsorStrip sponsors={data.sponsors} clock={clock} />
        ) : (
          <p className="broadcast-strip-empty">No eligible published sponsor assigned.</p>
        )}
      </section>
    );
  if (graphic === "compact-scoreboard") {
    const all = data.match ? data.results : data.standings;
    const rows = Math.min(12, settings.rows);
    const page = Math.min(data.control.page ?? 0, Math.max(0, Math.ceil(all.length / rows) - 1));
    return (
      <section className="broadcast-panel broadcast-hud broadcast-compact" aria-label={title}>
        <header>
          <h1>{title}</h1>
          <p>{settings.subtitle || (data.match ? `Published match ${data.match.matchNumber ?? "—"}` : "Published overall standings")}</p>
        </header>
        {all.length ? (
          <table>
            <caption className="sr-only">Compact published team points</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Team</th>
                {!settings.hiddenColumns.includes("kills") && <th scope="col">K</th>}
                <th scope="col">Pts</th>
              </tr>
            </thead>
            <tbody>
              {all.slice(page * rows, (page + 1) * rows).map((row) => (
                <tr key={row.teamId ?? row.teamName}>
                  <td>{row.rank}</td>
                  <td>
                    <div>
                      <Asset url={row.logoUrl} name={row.teamName} />
                      <span>{row.teamName}</span>
                    </div>
                  </td>
                  {!settings.hiddenColumns.includes("kills") && <td>{row.kills}</td>}
                  <td>{row.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No published results available.</p>
        )}
        <footer>
          {eventName}
          {Math.ceil(all.length / rows) > 1 ? ` · Page ${page + 1}` : ""}
        </footer>
      </section>
    );
  }
  if (graphic === "match-info") {
    const scheduled = data.match
      ? data.scheduledMatches?.find((row) => row.matchNumber === data.match?.matchNumber)
      : data.scheduledMatches?.find((row) => ["upcoming", "scheduled", "lobby-open"].includes(row.status));
    const stamp =
      scheduled && Number.isFinite(Date.parse(scheduled.scheduledAt))
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: data.timeZone,
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(new Date(scheduled.scheduledAt))
        : "Time not scheduled";
    return (
      <section className="broadcast-panel broadcast-hud broadcast-match-information">
        <Asset url={logo} name={eventName} />
        <div>
          <h1>{title}</h1>
          <h2>
            {settings.matchLabel ||
              `Match ${data.match?.matchNumber ?? scheduled?.matchNumber ?? "—"} · ${data.match?.map || scheduled?.map || "Map not selected"}`}
          </h2>
          <p>{settings.subtitle || eventName}</p>
          <p>
            {stamp} · {data.timeZone}
          </p>
          <small>
            {data.match
              ? data.match.status === "published"
                ? "Published results available"
                : "Private result preview"
              : scheduled?.status.replaceAll("-", " ") || "Awaiting published schedule"}
          </small>
        </div>
      </section>
    );
  }
  return (
    <section className={`broadcast-scene scene-mode-${graphic}`} aria-label={title}>
      <header className="scene-header">
        <div>
          <h1 title={title}>{title}</h1>
          <p>{settings.subtitle || [eventName, data.control.stageLabel].filter(Boolean).join(" · ")}</p>
        </div>
        <Asset url={logo} name={eventName} />
      </header>
      {graphic === "champion" ? (
        data.champion ? (
          <div className="scene-champion">
            <Asset url={data.champion.logoUrl} name={data.champion.teamName} />
            <div>
              <span>Official final standings</span>
              <h2>{data.champion.teamName}</h2>
              <dl>
                <div>
                  <dt>Total points</dt>
                  <dd>{data.champion.totalPoints}</dd>
                </div>
                <div>
                  <dt>Wins</dt>
                  <dd>{data.champion.wins}</dd>
                </div>
                <div>
                  <dt>Kills</dt>
                  <dd>{data.champion.kills}</dd>
                </div>
              </dl>
              <p>Completed tournament · all scheduled results published</p>
            </div>
          </div>
        ) : (
          empty("Champion unavailable. Complete the tournament, publish every scheduled result and select the full event scope.")
        )
      ) : null}
      {graphic === "player-comparison" ? (
        data.comparisonPlayers?.length === 2 ? (
          <div className="scene-player-comparison">
            {data.comparisonPlayers.map((player) => (
              <article key={player.playerId}>
                <Asset url={player.avatarUrl} name={player.playerName} />
                <div>
                  <h2>{player.playerName}</h2>
                  <p>{player.teamName}</p>
                  <dl>
                    {(["kills", "damage", "assists", "knocks", "survivalTime"] as const).filter(key => !settings.hiddenStats?.includes(key)).map(key => (
                      <div key={key}>
                        <dt>{broadcastLabel(settings, key)}</dt>
                        <dd>{key === "damage" ? Math.round(player[key]) : player[key]}</dd>
                      </div>
                    ))}
                  </dl>
                  {player.disqualified && <p>Match disqualification · not eligible for awards</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          empty("Select two different players from the same match in Broadcast Studio.")
        )
      ) : null}
      {graphic === "team-spotlight" ? (
        data.selectedTeam ? (
          <div className="scene-team-spotlight">
            <aside>
              <Asset url={data.selectedTeam.logoUrl} name={data.selectedTeam.name} />
              <h2>{data.selectedTeam.name}</h2>
              <p>{data.selectedTeam.scope === "tournament" ? "Published tournament statistics" : "Selected match statistics"}</p>
            </aside>
            <div>
              {data.selectedTeam.players.map((player) => (
                <article key={player.playerId}>
                  <Asset url={player.avatarUrl} name={player.playerName} />
                  <h3>{player.playerName}</h3>
                  <p>
                    {player.kills} kills · {Math.round(player.damage)} damage
                  </p>
                </article>
              ))}
              {!data.selectedTeam.players.length && <p>No verified player statistics in this period.</p>}
            </div>
          </div>
        ) : (
          empty("Select an event team and a statistics period.")
        )
      ) : null}
      {graphic === "advancement" ? (
        data.advancement?.teams.length ? (
          <div className="scene-advancement">
            <p>
              {data.advancement.final
                ? "Approved completed stage · final advancement positions"
                : "Provisional · stage completion and publication approval required"}{" "}
              · Top {data.advancement.count}
            </p>
            <div>
              {data.advancement.teams
                .slice((data.control.page ?? 0) * settings.rows, ((data.control.page ?? 0) + 1) * settings.rows)
                .map((row) => (
                  <article key={row.teamId}>
                    <strong>#{row.rank}</strong>
                    <Asset url={row.logoUrl} name={row.teamName} />
                    <h2>{row.teamName}</h2>
                    <span>{row.totalPoints} PTS</span>
                  </article>
                ))}
            </div>
          </div>
        ) : (
          empty("Select an approved stage with an advancement count, without a group/day filter, and publish its results.")
        )
      ) : null}
      {settings.showSponsors && <BroadcastSponsorStrip sponsors={data.sponsors} clock={clock} />}
    </section>
  );
}
