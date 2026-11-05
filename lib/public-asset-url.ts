import { normalizeManagedPublicAssetKey } from "./public-asset-key";

const PUBLIC_ASSET_PROXY_PATH = "/api/uploads/r2";
const SAFE_ABSOLUTE_IMAGE_HOSTS = new Set([
  "assets.bravogamingesports.com",
  "bravo-gaming-esports-nextjs.vercel.app",
  "bravo-gaming-esports.vercel.app",
  "hldppfhtkfgthainismr.supabase.co",
  "i.ytimg.com",
]);

const configuredPublicAssetOrigin = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (!configuredUrl) return null;
  try {
    const parsed = new URL(configuredUrl);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash ? parsed.origin.toLowerCase() : null;
  } catch {
    return null;
  }
})();

function hasUnsafePathSegment(pathname: string) {
  return (
    pathname.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(pathname) ||
    pathname
      .split("/")
      .filter(Boolean)
      .some((segment) => segment === "." || segment === "..")
  );
}

function normalizeManagedObjectKey(value: string) {
  return normalizeManagedPublicAssetKey(value, { repairLegacyEncoding: true });
}

function buildManagedProxyUrl(objectKey: string) {
  const normalizedKey = normalizeManagedObjectKey(objectKey);
  return normalizedKey ? `${PUBLIC_ASSET_PROXY_PATH}?key=${encodeURIComponent(normalizedKey)}` : null;
}

function isKnownAbsoluteImageUrl(url: URL) {
  const normalizedHostname = url.hostname.toLowerCase();
  const normalizedOrigin = url.origin.toLowerCase();
  return (url.port === "" && SAFE_ABSOLUTE_IMAGE_HOSTS.has(normalizedHostname)) || normalizedOrigin === configuredPublicAssetOrigin;
}

/**
 * Resolves persisted public image references at the render boundary.
 *
 * Canonical managed keys always become a single-encoded proxy URL, packaged
 * `/images` assets are preserved, and arbitrary external hosts are rejected.
 * This module intentionally has no server-only imports so the same policy is
 * used by server and client components.
 */
export function resolvePublicAssetUrl(value?: string | null) {
  const candidate = value?.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate) || candidate.startsWith("//")) {
    return null;
  }

  if (!candidate.includes("://") && !candidate.startsWith("/")) {
    return buildManagedProxyUrl(candidate);
  }

  if (candidate.startsWith("/")) {
    let parsed: URL;
    try {
      parsed = new URL(candidate, "https://bravo.internal");
    } catch {
      return null;
    }

    if (hasUnsafePathSegment(parsed.pathname)) {
      return null;
    }

    if (parsed.pathname === PUBLIC_ASSET_PROXY_PATH) {
      const key = parsed.searchParams.get("key");
      return key ? buildManagedProxyUrl(key) : null;
    }

    if (parsed.pathname === "/images" || parsed.pathname.startsWith("/images/")) {
      return parsed.pathname;
    }

    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !isKnownAbsoluteImageUrl(parsed) || hasUnsafePathSegment(parsed.pathname) ||
      /^\/api\/uploads\/private(?:\/|$)/i.test(parsed.pathname) ||
      /^\/storage\/v1\/object\/(?:sign|authenticated)(?:\/|$)/i.test(parsed.pathname) ||
      [...parsed.searchParams.keys()].some(key => /^(?:x-amz-|token$|signature$)/i.test(key))) {
      return null;
    }
    if (parsed.pathname === PUBLIC_ASSET_PROXY_PATH) {
      const key = parsed.searchParams.get("key");
      return key ? buildManagedProxyUrl(key) : null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveSponsorLogoUrl(input: { bannerUrl?: string | null; designAssetUrl?: string | null; logoUrl?: string | null }) {
  return resolvePublicAssetUrl(input.logoUrl) ?? resolvePublicAssetUrl(input.designAssetUrl) ?? resolvePublicAssetUrl(input.bannerUrl);
}

export function resolveSponsorHeroUrl(input: { bannerUrl?: string | null; designAssetUrl?: string | null; logoUrl?: string | null }) {
  return resolvePublicAssetUrl(input.bannerUrl) ?? resolvePublicAssetUrl(input.designAssetUrl) ?? resolvePublicAssetUrl(input.logoUrl);
}
