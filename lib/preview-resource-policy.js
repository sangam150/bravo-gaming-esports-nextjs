const STAGING_SUPABASE_ORIGIN = "https://yppefayrepkqpqtprbqa.supabase.co";
const STAGING_PROJECT_REF = "yppefayrepkqpqtprbqa";
const PRODUCTION_R2_BUCKETS = new Set(["bravo-gaming-assets", "bravo-gaming-private"]);

/** @param {Record<string, string | undefined>} environment */
function isPreview(environment) {
  return environment.VERCEL_ENV?.trim().toLowerCase() === "preview";
}

/** @param {string | undefined} value */
function text(value) {
  return value?.trim() || "";
}

/** @param {string} name @param {string} key @param {"public" | "server"} kind */
function verifyPreviewKey(name, key, kind) {
  if (key.startsWith("eyJ")) {
    let claims;
    try {
      const parts = key.split(".");
      if (parts.length !== 3 || !parts.every(Boolean)) throw new Error("Invalid JWT");
      claims = JSON.parse(atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")));
    } catch {
      throw new Error(`Vercel Preview ${name} must be a valid staging key.`);
    }
    if (claims?.ref !== STAGING_PROJECT_REF || claims?.role !== (kind === "public" ? "anon" : "service_role"))
      throw new Error(`Vercel Preview ${name} does not identify the designated staging project and required role.`);
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now())
      throw new Error(`Vercel Preview ${name} has expired.`);
    return;
  }
  const expected = kind === "public" ? /^sb_publishable_[A-Za-z0-9_-]+$/ : /^sb_secret_[A-Za-z0-9_-]+$/;
  if (!expected.test(key))
    throw new Error(`Vercel Preview ${name} must use the correct ${kind} staging key type.`);
}

/** Validate metadata only; opaque API-key ownership still requires real staging verification.
 * @param {Record<string, string | undefined>} environment
 */
function assertPreviewSupabaseEnvironment(environment) {
  if (!isPreview(environment)) return;
  let endpoint;
  try { endpoint = new URL(text(environment.NEXT_PUBLIC_SUPABASE_URL)); }
  catch { throw new Error("Vercel Preview requires the designated staging NEXT_PUBLIC_SUPABASE_URL."); }
  if (endpoint.origin !== STAGING_SUPABASE_ORIGIN || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !["", "/"].includes(endpoint.pathname))
    throw new Error("Vercel Preview Supabase must target only the designated staging project.");

  const publicNames = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const serverNames = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (!publicNames.some(name => text(environment[name])))
    throw new Error("Vercel Preview requires NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  if (!serverNames.some(name => text(environment[name])))
    throw new Error("Vercel Preview requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  // Reject unsafe inherited fallback keys even when a modern key takes precedence.
  for (const name of publicNames) if (text(environment[name])) verifyPreviewKey(name, text(environment[name]), "public");
  for (const name of serverNames) if (text(environment[name])) verifyPreviewKey(name, text(environment[name]), "server");
}

/** @param {Record<string, string | undefined>} environment */
function assertPreviewR2Environment(environment) {
  if (!isPreview(environment)) return;
  const names = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PRIVATE_BUCKET_NAME", "R2_ENDPOINT"];
  if (!names.some(name => text(environment[name]))) return; // Missing storage stays unavailable; no production fallback.
  const publicBucket = text(environment.R2_BUCKET_NAME);
  const privateBucket = text(environment.R2_PRIVATE_BUCKET_NAME);
  if (!publicBucket || !privateBucket)
    throw new Error("Vercel Preview R2 requires dedicated R2_BUCKET_NAME and R2_PRIVATE_BUCKET_NAME.");
  if (PRODUCTION_R2_BUCKETS.has(publicBucket.toLowerCase()) || PRODUCTION_R2_BUCKETS.has(privateBucket.toLowerCase()))
    throw new Error("Vercel Preview must not use known production R2 bucket names; configure dedicated staging buckets.");
  if (publicBucket.toLowerCase() === privateBucket.toLowerCase())
    throw new Error("Vercel Preview public and private R2 storage must use different staging buckets.");
  const accountId = text(environment.R2_ACCOUNT_ID);
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("Vercel Preview requires a valid staging R2_ACCOUNT_ID.");
  let endpoint;
  try { endpoint = new URL(text(environment.R2_ENDPOINT) || `https://${accountId}.r2.cloudflarestorage.com`); }
  catch { throw new Error("Vercel Preview R2_ENDPOINT must be the staging account's HTTPS R2 endpoint."); }
  if (endpoint.origin !== `https://${accountId.toLowerCase()}.r2.cloudflarestorage.com` || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !["", "/"].includes(endpoint.pathname))
    throw new Error("Vercel Preview R2_ENDPOINT must match its configured staging account over HTTPS.");
}

/** @param {Record<string, string | undefined>} environment */
function assertPreviewResourceEnvironment(environment) {
  assertPreviewSupabaseEnvironment(environment);
  assertPreviewR2Environment(environment);
}

module.exports = { assertPreviewResourceEnvironment, assertPreviewSupabaseEnvironment, assertPreviewR2Environment };
