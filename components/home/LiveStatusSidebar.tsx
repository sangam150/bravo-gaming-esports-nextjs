import MapThumb from "@/components/ui/MapThumb";

const scrims = [
  { map: "Rondo", status: "COMPLETED", statusClass: "text-accent-green" },
  { map: "Erangel", status: "UP NEXT", statusClass: "text-accent-blue" },
  { map: "Miramar", status: "COMING UP", statusClass: "text-text-muted" },
  { map: "Taego", status: "COMING UP", statusClass: "text-text-muted" },
];

export default function LiveStatusSidebar() {
  return (
    <aside className="esports-card sticky top-20 flex flex-col p-5 lg:w-[320px] lg:shrink-0">
      <div className="flex items-center justify-between">
        <p className="font-display text-label font-bold uppercase tracking-[0.1em] text-text-muted">Live Status</p>
        <div className="flex items-center gap-1.5 rounded border border-accent-red/30 bg-accent-red/10 px-2 py-1">
          <span className="live-dot h-1.5 w-1.5" />
          <span className="font-display text-label font-bold uppercase text-accent-red">Live Now</span>
        </div>
      </div>

      <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wide text-white">Today&apos;s Scrims</h3>

      <div className="mt-4 space-y-2">
        {scrims.map((s) => (
          <div key={s.map} className="flex items-center justify-between gap-3 rounded-card border border-white/[0.05] bg-bg-primary px-3 py-2.5">
            <div className="flex items-center gap-3">
              <MapThumb map={s.map} />
              <span className="font-display text-sm font-semibold uppercase text-white">{s.map}</span>
            </div>
            <span className={`font-display text-label font-bold uppercase ${s.statusClass}`}>
              {s.status === "COMPLETED" ? "COMPLETED ✓" : s.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-white/[0.08] pt-4">
        <p className="font-display text-label font-bold uppercase text-text-muted">Starting At</p>
        <p className="mt-1 font-mono-stat text-2xl font-extrabold text-accent-blue">8:00 PM NPT</p>
      </div>
    </aside>
  );
}
