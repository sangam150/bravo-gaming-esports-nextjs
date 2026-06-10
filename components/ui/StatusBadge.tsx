import type { TournamentStatus } from "@/lib/types";

const styles: Record<string, string> = {
  LIVE: "bg-accent-red/15 text-accent-red border-accent-red",
  OPEN: "bg-accent-blue/15 text-accent-blue border-accent-blue",
  REGISTERING: "bg-transparent text-accent-blue border-accent-blue",
  UPCOMING: "bg-white/5 text-text-muted border-white/15",
  COMPLETED: "bg-accent-green/15 text-accent-green border-accent-green",
};

const labels: Record<string, string> = {
  LIVE: "Ongoing",
  OPEN: "Open",
  REGISTERING: "Registering",
  UPCOMING: "Upcoming",
  COMPLETED: "Finished",
};

export default function StatusBadge({ status }: { status: TournamentStatus | string }) {
  const style = styles[status] ?? "bg-white/5 text-text-muted border-white/15";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 font-display text-label font-bold uppercase ${style}`}>
      {status === "LIVE" && <span className="live-dot h-1.5 w-1.5" />}
      {labels[status] ?? status}
    </span>
  );
}
