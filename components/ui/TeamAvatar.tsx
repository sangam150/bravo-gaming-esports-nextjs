export default function TeamAvatar({
  name,
  size = "md",
  imageUrl,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
}) {
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  const sizes = {
    sm: "h-9 w-9 text-[10px]",
    md: "h-10 w-10 text-[11px]",
    lg: "h-14 w-14 text-sm",
  };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-2xl border border-white/10 bg-bg-primary object-cover shadow-[0_10px_24px_rgba(0,0,0,0.22)] ${sizes[size]}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-accent-blue to-blue-900 font-display font-extrabold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
