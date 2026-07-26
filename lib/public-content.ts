const PUBLIC_TEXT_MARKERS = [
  "bravo_demo_seed_2026",
  "bravo_demo_seed_",
  "demo seed",
  "demo_seed",
  "launch preview",
  "launch-preview",
  "launch_preview",
  "launch preview placeholder",
  "launch preview qa",
  "launch preview demo",
  "seeded for launch preview",
  "seeded for full-site qa",
  "demo sponsor profile",
  "demo media item",
  "demo announcement",
  "hidden moderation note",
  "qa visual test - do not use",
  "placeholder uploaded to r2",
  "this demo article exists only to validate",
] as const;

const PUBLIC_ASSET_MARKERS = [
  "bravo_demo_seed_2026",
  "/demo/",
  "launch-event-banner",
  "launch-preview",
  "launch_preview",
  "placeholder",
  "qa-visual",
  "qavt",
] as const;

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function hasPublicDemoSeedTag(value?: string | null) {
  const normalized = normalizeValue(value);
  return normalized.startsWith("bravo_demo_seed_") || normalized === "demo_seed";
}

export function hasPublicDemoMarker(...values: Array<string | null | undefined>) {
  return values.some((value) => {
    const normalized = normalizeValue(value);
    if (!normalized) {
      return false;
    }

    if (hasPublicDemoSeedTag(normalized)) {
      return true;
    }

    if (PUBLIC_TEXT_MARKERS.some((marker) => normalized.includes(marker))) {
      return true;
    }

    return /\b(?:demo|qa|qavt|test)\b/.test(normalized);
  });
}

export function isInternalOnlyCategory(value?: string | null) {
  return normalizeValue(value) === "internal";
}

export function sanitizePublicCopy(value?: string | null, fallback?: string) {
  if (!value) {
    return fallback;
  }

  const cleaned = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !hasPublicDemoMarker(sentence))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

export function sanitizePublicAssetUrl(value?: string | null) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return undefined;
  }

  if (PUBLIC_ASSET_MARKERS.some((marker) => normalized.includes(marker))) {
    return undefined;
  }

  return value;
}
