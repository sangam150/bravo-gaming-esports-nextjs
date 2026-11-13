import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { STAGING_PROJECT_REF } from "../../qa/staging-target.mjs";

export const STAGING_SUPABASE_ORIGIN = `https://${STAGING_PROJECT_REF}.supabase.co`;
const discordNames = [
  "BRAVO_DISCORD_GUILD_ID", "DISCORD_BOT_TOKEN", "DISCORD_ROLE_ADMIN_ID", "DISCORD_ROLE_MODERATOR_ID",
  "DISCORD_ROLE_ORGANIZER_ID", "DISCORD_ROLE_TEAM_MANAGER_ID", "DISCORD_ROLE_IGL_ID", "DISCORD_ROLE_COACH_ID",
  "DISCORD_ROLE_PLAYER_ID", "DISCORD_ROLE_VIEWER_ID", "DISCORD_ROLE_BANNED_ID", "DISCORD_ROLE_SUSPENDED_ID",
  "DISCORD_ROLE_SYNC_TTL_SECONDS",
];

function validateKey(key, kind) {
  if (!key || /your_|placeholder|replace_me|^<.*>$/.test(key)) throw new Error(`A real staging ${kind} key is required.`);
  if (kind === "public" && key.startsWith("sb_secret_")) throw new Error("The browser must never receive a privileged Supabase key.");
  if (kind === "server" && key.startsWith("sb_publishable_")) throw new Error("A staging server secret or service-role key is required.");
  if (key.startsWith("eyJ")) {
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString("utf8")); }
    catch { throw new Error(`The staging ${kind} JWT is malformed.`); }
    if (claims.ref !== STAGING_PROJECT_REF || claims.role !== (kind === "public" ? "anon" : "service_role"))
      throw new Error(`The staging ${kind} JWT belongs to a different project or role.`);
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) throw new Error(`The staging ${kind} JWT has expired.`);
  } else if (!key.startsWith(kind === "public" ? "sb_publishable_" : "sb_secret_")) {
    throw new Error(`The staging ${kind} key format is unsupported.`);
  }
}

// Pure construction allows offline checks without reading or inheriting real keys.
export function buildStagingDevelopmentEnvironment({ staging, inherited = {}, fileVariableNames = [], discord = false }) {
  const read = name => typeof staging[name] === "string" ? staging[name].trim() : "";
  if (inherited.NODE_TLS_REJECT_UNAUTHORIZED === "0" || read("NODE_TLS_REJECT_UNAUTHORIZED") === "0")
    throw new Error("TLS certificate verification must remain enabled for staging development.");
  if (read("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "") !== STAGING_SUPABASE_ORIGIN)
    throw new Error("Local staging development requires the designated staging Supabase URL. Production fallback is forbidden.");
  const publicKey = read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serverKey = read("SUPABASE_SECRET_KEY") || read("SUPABASE_SERVICE_ROLE_KEY");
  validateKey(publicKey, "public");
  validateKey(serverKey, "server");
  const environment = { ...inherited };
  // Explicit blanks prevent Next's automatic .env.local loading from filling gaps.
  for (const name of [...fileVariableNames, ...Object.keys(staging)]) environment[name] = "";
  for (const name of Object.keys(environment))
    if (/SUPABASE|R2_|PUBG_|DISCORD_|DATABASE_URL|DIRECT_URL|CRON_SECRET|VERCEL_|QA_|ADMIN_PROVISION/.test(name)) environment[name] = "";
  for (const name of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN", ...discordNames]) environment[name] = "";
  environment.NODE_ENV = "development";
  environment.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  environment.NEXT_PUBLIC_SUPABASE_URL = STAGING_SUPABASE_ORIGIN;
  environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicKey;
  environment.SUPABASE_SECRET_KEY = serverKey;
  environment.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED = "false";
  environment.DISCORD_LOGIN_ENABLED = discord ? read("DISCORD_LOGIN_ENABLED") : "false";
  if (discord) {
    if (!read("DISCORD_BOT_TOKEN")) throw new Error("Discord mode requires DISCORD_BOT_TOKEN in the staging file.");
    const snowflake = value => /^\d{1,20}$/.test(value) && BigInt(value) > 0n && BigInt(value) <= 18446744073709551615n;
    if (!snowflake(read("BRAVO_DISCORD_GUILD_ID"))) throw new Error("Discord mode requires a numeric BRAVO_DISCORD_GUILD_ID.");
    for (const name of discordNames.filter(name => name.endsWith("_ID")))
      if (read(name) && !snowflake(read(name))) throw new Error(`Discord mode requires a numeric ${name}.`);
    for (const name of discordNames) environment[name] = read(name);
  }
  return environment;
}

export function readStagingDevelopmentEnvironment({ root = process.cwd(), inherited = process.env, discord = false } = {}) {
  const file = path.join(root, ".env.staging.local");
  if (!existsSync(file)) throw new Error("Configure the ignored .env.staging.local before starting local staging development.");
  const staging = parseEnv(readFileSync(file, "utf8"));
  const fileVariableNames = new Set();
  for (const name of [".env", ".env.example", ".env.local", ".env.development", ".env.development.local", ".env.staging.local"])
    if (existsSync(path.join(root, name))) for (const key of Object.keys(parseEnv(readFileSync(path.join(root, name), "utf8")))) fileVariableNames.add(key);
  return buildStagingDevelopmentEnvironment({ staging, inherited, fileVariableNames, discord });
}
