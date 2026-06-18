export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function coerceSlug(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return slugify(normalized || fallback);
}
