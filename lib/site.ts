const FALLBACK_SITE_URL = "https://bravogamingesports.com";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!configuredUrl) {
    return FALLBACK_SITE_URL;
  }

  const normalizedUrl = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
  return normalizedUrl.replace(/\/$/, "");
}
