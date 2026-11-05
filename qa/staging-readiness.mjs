import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { STAGING_ORIGIN, STAGING_PROJECT_REF, readStagingEnvironment, assertStagingTarget } from "./staging-target.mjs";

const environment = readStagingEnvironment();
const target = assertStagingTarget(environment);
async function check(url) {
  try {
    const headers =
      url === STAGING_ORIGIN && environment.VERCEL_AUTOMATION_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": environment.VERCEL_AUTOMATION_BYPASS_SECRET }
        : {};
    const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const location = response.headers.get("location");
    const redirect = location ? new URL(location, url) : null;
    return {
      reachable: true,
      status: response.status,
      vercelError: response.headers.get("x-vercel-error"),
      redirectTo: redirect ? `${redirect.origin}${redirect.pathname}` : null,
      protectedByVercel: url === STAGING_ORIGIN && ([401, 403].includes(response.status) || redirect?.hostname === "vercel.com"),
      apiKeyRequired: url.includes("supabase.co") && response.status === 401,
    };
  } catch (error) {
    return { reachable: false, error: error.cause?.code ?? error.name ?? "network_failure" };
  }
}
const previousFile = new URL("../.env.local", import.meta.url);
const previous = existsSync(previousFile) ? parseEnv(readFileSync(previousFile, "utf8")) : {};
const present = (name) => Boolean(environment[name]?.trim());
const [website, supabase] = await Promise.all([check(STAGING_ORIGIN), check(`${target.supabaseUrl}/auth/v1/health`)]);
const report = {
  checkedAt: new Date().toISOString(),
  stagingOrigin: STAGING_ORIGIN,
  stagingProjectRef: STAGING_PROJECT_REF,
  existingLocalRuntimeTargetsStaging: previous.NEXT_PUBLIC_SUPABASE_URL?.trim() === target.supabaseUrl,
  website,
  supabase,
  configuration: {
    publicKey: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serverKey: present("SUPABASE_SECRET_KEY") || present("SUPABASE_SERVICE_ROLE_KEY"),
    adminEmail: present("QA_STAGING_ADMIN_EMAIL"),
    adminPassword: present("QA_STAGING_ADMIN_PASSWORD"),
    r2Credentials: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"].every(present),
    permittedMatchId: present("QA_STAGING_PUBG_MATCH_ID"),
    teamAccount: present("QA_STAGING_TEAM_EMAIL"),
    playerAccount: present("QA_STAGING_PLAYER_EMAIL"),
  },
};
mkdirSync(new URL("../qa-artifacts/", import.meta.url), { recursive: true });
writeFileSync(new URL("../qa-artifacts/staging-readiness.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!website.reachable || !supabase.reachable || !report.configuration.publicKey || !report.configuration.adminPassword)
  process.exitCode = 1;
