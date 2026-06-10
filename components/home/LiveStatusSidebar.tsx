import MapThumb from "@/components/ui/MapThumb";

const scrims = [
  { map: "Rondo", status: "Completed", statusClass: "text-accent-green" },
  { map: "Erangel", status: "Up Next", statusClass: "text-accent-blue" },
  { map: "Miramar", status: "Coming Up", statusClass: "text-text-muted" },
  { map: "Taego", status: "Coming Up", statusClass: "text-text-muted" },
];

export default function LiveStatusSidebar() {
  return (
    <aside className="esports-card flex w-full flex-col p-5 xl:sticky xl:top-20 xl:w-[320px] xl:shrink-0">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-label font-bold uppercase tracking-[0.1em] text-text-muted">Live Status</p>
        <div className="flex items-center gap-1.5 rounded border border-accent-red/30 bg-accent-red/10 px-2 py-1">
          <span className="live-dot h-1.5 w-1.5" />
          <span className="font-display text-label font-bold uppercase text-accent-red">Live Now</span>
        </div>
      </div>

      <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wide text-white">Today&apos;s Scrims</h3>

      <div className="mt-4 space-y-2">
        {scrims.map((scrim) => (
          <div
            key={scrim.map}
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

      <div className="mt-5 border-t border-white/[0.08] pt-4 xl:mt-auto">
        <p className="font-display text-label font-bold uppercase text-text-muted">Starting At</p>
        <p className="mt-1 font-mono-stat text-2xl font-extrabold text-accent-blue">8:00 PM NPT</p>
      </div>
    </aside>
  );
}
