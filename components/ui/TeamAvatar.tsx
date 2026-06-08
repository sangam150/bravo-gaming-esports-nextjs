export default function TeamAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-8 w-8 text-[11px]", lg: "h-12 w-12 text-sm" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-blue-900 font-display font-extrabold text-white ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
