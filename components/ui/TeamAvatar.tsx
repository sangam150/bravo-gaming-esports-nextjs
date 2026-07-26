import ManagedImage from "@/components/ui/ManagedImage";

export default function TeamAvatar({ name, size = "md", imageUrl }: { name: string; size?: "sm" | "md" | "lg"; imageUrl?: string }) {
  const initials = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  const sizes = {
    sm: "h-9 w-9 text-[10px]",
    md: "h-10 w-10 text-[11px]",
    lg: "h-14 w-14 text-sm",
  };

  if (imageUrl) {
    return (
      <ManagedImage
        src={imageUrl}
        alt={name}
        sizes={size === "lg" ? "56px" : size === "md" ? "40px" : "36px"}
        wrapperClassName={`shrink-0 rounded-[18px] border border-white/10 bg-bg-primary shadow-[0_14px_28px_rgba(0,0,0,0.24)] ${sizes[size]}`}
        className="object-cover"
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[18px] border border-accent-blue/25 bg-[linear-gradient(180deg,rgba(47,152,255,0.92),rgba(8,80,178,0.96))] font-display font-extrabold text-white shadow-[0_14px_28px_rgba(0,0,0,0.24)] ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
