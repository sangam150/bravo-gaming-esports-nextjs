export default function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="esports-card p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}
