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
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-8 w-8 text-[11px]", lg: "h-12 w-12 text-sm" };

  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`shrink-0 rounded-full object-cover ${sizes[size]}`} />;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-blue-900 font-display font-extrabold text-white ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
