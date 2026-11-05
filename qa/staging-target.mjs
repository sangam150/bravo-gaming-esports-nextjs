import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const STAGING_PROJECT_REF = "yppefayrepkqpqtprbqa";
export const STAGING_ORIGIN = "https://bravo-gaming-esports-mvfxuoofn-sangams-projects-9468acfa.vercel.app";
export const PRODUCTION_PROJECT_REF = "hldppfhtkfgthainismr";

export function readStagingEnvironment() {
  const file = new URL("../.env.staging.local", import.meta.url);
  return { ...process.env, ...(existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {}) };
}

export function assertStagingTarget(environment) {
  const configured = new URL(environment.NEXT_PUBLIC_SUPABASE_URL || "https://unconfigured.invalid");
  if (configured.origin !== `https://${STAGING_PROJECT_REF}.supabase.co`)
    throw new Error("Staging tests require the explicitly designated staging Supabase project. Production fallback is forbidden.");
  const origin = new URL(environment.QA_AUTH_ORIGIN || STAGING_ORIGIN);
  if (origin.origin !== STAGING_ORIGIN || origin.username || origin.password || origin.search || origin.hash)
    throw new Error("The browser target must match the designated staging deployment.");
  return { supabaseUrl: configured.origin, origin: origin.origin };
}
