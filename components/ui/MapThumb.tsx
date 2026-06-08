const mapColors: Record<string, string> = {
  Rondo: "from-emerald-800 to-emerald-950",
  Erangel: "from-green-800 to-green-950",
  Miramar: "from-amber-800 to-amber-950",
  Taego: "from-purple-800 to-purple-950",
};

export default function MapThumb({ map }: { map: string }) {
  const gradient = mapColors[map] ?? "from-slate-700 to-slate-900";
  return (
    <div className={`map-thumb flex items-center justify-center bg-gradient-to-br ${gradient}`}>
      <span className="font-display text-[10px] font-bold uppercase text-white/80">{map.slice(0, 3)}</span>
    </div>
  );
}
