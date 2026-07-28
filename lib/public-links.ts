const INTERNAL_ORIGIN = "https://bravo.invalid";

function hasUnsafeUrlCharacters(value: string) {
  return /[\u0000-\u001f\u007f\\]/.test(value);
}

export function normalizePublicActionHref(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue || hasUnsafeUrlCharacters(normalizedValue)) {
    return undefined;
  }

  if (normalizedValue.startsWith("#")) {
    try {
      return new URL(normalizedValue, INTERNAL_ORIGIN).hash || undefined;
    } catch {
      return undefined;
    }
  }

  if (normalizedValue.startsWith("/") && !normalizedValue.startsWith("//")) {
    try {
      const parsedUrl = new URL(normalizedValue, INTERNAL_ORIGIN);
      if (parsedUrl.origin !== INTERNAL_ORIGIN) {
        return undefined;
      }

      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      return undefined;
    }
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
      return undefined;
    }

    return parsedUrl.toString();
  } catch {
    return undefined;
  }
}

export function getCanonicalPublicEventHref(event: { gameSlug?: string | null; slug: string }) {
  const slug = event.slug.trim();
  if (!slug) {
    return "/events";
  }

  const encodedSlug = encodeURIComponent(slug);
  return event.gameSlug?.trim().toLowerCase() === "pubg-pc" ? `/pubg/events/${encodedSlug}` : `/events/${encodedSlug}`;
}
