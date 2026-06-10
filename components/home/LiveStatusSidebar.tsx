"use client";

import MapThumb from "@/components/ui/MapThumb";
import { useBravoRealtimeData } from "@/lib/realtime-hooks";

function buildStatusItems(day: ReturnType<typeof useBravoRealtimeData>["scrimDayResults"][number] | undefined) {
  if (!day) return [];

  if (day.matches.length > 0) {
    return day.matches.slice(0, 4).map((match) => ({
      key: match.id,
      map: match.map,
      status: "Completed",
      statusClass: "text-accent-green",
    }));
  }

  return day.scrims.slice(0, 4).map((scrim) => ({
    key: scrim.id,
    map: scrim.map,
    status:
      scrim.status === "completed"
        ? "Completed"
        : scrim.status === "live"
          ? "Live"
          : scrim.status === "waiting_for_data"
            ? "Awaiting Data"
            : "Scheduled",
    statusClass:
      scrim.status === "completed"
        ? "text-accent-green"
        : scrim.status === "live"
          ? "text-accent-red"
          : scrim.status === "waiting_for_data"
            ? "text-accent-yellow"
            : "text-accent-blue",
  }));
}

export default function LiveStatusSidebar() {
  const { scrimDayResults } = useBravoRealtimeData();
  const latestDay = scrimDayResults[0];
  const statusItems = buildStatusItems(latestDay);
  const hasData = statusItems.length > 0;
  const statusLabel =
    latestDay?.status === "live" ? "Live Now" : latestDay?.status === "completed" ? "Latest Results" : "Awaiting Data";

  return (
    <aside className="esports-card flex w-full flex-col p-5 xl:sticky xl:top-20 xl:w-[320px] xl:shrink-0">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-label font-bold uppercase tracking-[0.1em] text-text-muted">Live Status</p>
        <div className="flex items-center gap-1.5 rounded border border-accent-red/30 bg-accent-red/10 px-2 py-1">
          <span className="live-dot h-1.5 w-1.5" />
          <span className="font-display text-label font-bold uppercase text-accent-red">{statusLabel}</span>
        </div>
      </div>

      <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wide text-white">
        {latestDay?.label ?? "Current Scrims"}
      </h3>

      {hasData ? (
        <div className="mt-4 space-y-2">
          {statusItems.map((scrim) => (
            <div
              key={scrim.key}
              className="flex items-center justify-between gap-3 rounded-card border border-white/[0.05] bg-bg-primary px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MapThumb map={scrim.map} />
                <span className="font-display text-sm font-semibold uppercase text-white">{scrim.map}</span>
              </div>
              <span className={`max-w-[9rem] text-right font-display text-label font-bold uppercase ${scrim.statusClass}`}>
                {scrim.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
          Matches not imported yet for the active scrim day.
        </div>
      )}

      <div className="mt-5 border-t border-white/[0.08] pt-4 xl:mt-auto">
        <p className="font-display text-label font-bold uppercase text-text-muted">Starting At</p>
        <p className="mt-1 font-mono-stat text-2xl font-extrabold text-accent-blue">
          {latestDay?.scrims[0]?.lobbyTime ?? "Not scheduled yet"}
        </p>
      </div>
    </aside>
  );
}
