import ManagedImage from "@/components/ui/ManagedImage";

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
    return (
      <ManagedImage
        src={imageUrl}
        alt={label}
        sizes={size === "lg" ? "64px" : size === "md" ? "48px" : "36px"}
        wrapperClassName={`shrink-0 border border-white/10 bg-bg-primary shadow-[0_12px_24px_rgba(0,0,0,0.22)] ${sizes[size]}`}
        className="object-contain p-1"
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-accent-blue/20 bg-[linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] font-black uppercase tracking-[0.15em] text-white shadow-[0_0_24px_rgba(20,126,245,0.12)] ${sizes[size]}`}
    >
      {label.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}
    </div>
  );
}
