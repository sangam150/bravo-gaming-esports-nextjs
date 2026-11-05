import { normalizePublicUploadFolder } from "./upload-config";

const DEMO_SEED_TAG_PATTERN = /^[a-z0-9_-]+$/i;

function decodeLegacyObjectKey(value: string) {
  if (!/%(?:2f|5c|25)/i.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Accepts only object keys that belong to a public managed-upload namespace.
 * Private upload folders must never be reachable through the public R2 proxy,
 * including when they are nested below the demo seed prefix.
 */
export function normalizeManagedPublicAssetKey(value: string, options: { repairLegacyEncoding?: boolean } = {}) {
  const candidate = options.repairLegacyEncoding ? decodeLegacyObjectKey(value.trim()) : value.trim();
  if (!candidate) return null;

  const normalized = candidate.replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.includes("\\") || /[\u0000-\u001f\u007f]/.test(normalized)) {
    return null;
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }

  const [folder, demoSeedTag, demoFolder] = segments;
  if (folder && normalizePublicUploadFolder(folder) && segments.length >= 2) {
    return normalized;
  }

  if (
    folder === "demo" &&
    segments.length >= 4 &&
    demoSeedTag &&
    DEMO_SEED_TAG_PATTERN.test(demoSeedTag) &&
    demoFolder &&
    normalizePublicUploadFolder(demoFolder)
  ) {
    return normalized;
  }

  return null;
}
