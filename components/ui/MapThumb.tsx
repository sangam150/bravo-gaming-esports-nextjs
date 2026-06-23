const mapColors: Record<string, string> = {
  Rondo: "from-sky-900 to-slate-950",
  Erangel: "from-emerald-900 to-slate-950",
  Miramar: "from-amber-900 to-slate-950",
  Taego: "from-cyan-900 to-slate-950",
};

export default function MapThumb({ map }: { map: string }) {
  const gradient = mapColors[map] ?? "from-slate-700 to-slate-900";
  return (
    <div className={`map-thumb flex items-center justify-center bg-gradient-to-br ${gradient}`}>
      <span className="font-display text-[10px] font-bold uppercase text-white/80">{map.slice(0, 3)}</span>
    </div>
  );
}
