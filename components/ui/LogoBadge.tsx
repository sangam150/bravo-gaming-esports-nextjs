export default function LogoBadge({
  label,
  size = "md",
  imageUrl,
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 text-[10px] rounded-xl",
    md: "h-12 w-12 text-xs rounded-2xl",
    lg: "h-16 w-16 text-sm rounded-2xl",
  };

  if (imageUrl) {
    return <img src={imageUrl} alt={label} className={`shrink-0 border border-white/10 object-cover ${sizes[size]}`} />;
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-white/10 bg-gradient-to-br from-slate-800 to-[#0a1628] font-black uppercase tracking-[0.15em] text-white shadow-[0_0_20px_rgba(0,180,255,0.1)] ${sizes[size]}`}
    >
      {label.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}
    </div>
  );
}
