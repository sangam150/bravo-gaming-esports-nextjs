import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const artifactsDir = path.join(projectRoot, "qa-artifacts");
const outputPath = path.join(artifactsDir, "supabase-readiness.json");

const REQUIRED_BUCKET_GROUPS = [
  { label: "team-logos", bucketNames: ["team-logos"] },
  { label: "player-assets", bucketNames: ["player-avatars", "player-photos"] },
  { label: "event-banners", bucketNames: ["event-banners"] },
  { label: "sponsor-assets", bucketNames: ["sponsor-logos", "sponsor-assets"] },
  { label: "result-screenshots", bucketNames: ["result-screenshots"] },
  { label: "scoreboard-images", bucketNames: ["scoreboard-images"] },
  { label: "match-media", bucketNames: ["match-media"] },
  { label: "media-assets", bucketNames: ["media-assets", "media-uploads"] },
  { label: "hero-slides", bucketNames: ["hero-slides"] },
];

const RECOMMENDED_LAUNCH_BUCKET_GROUPS = [
  { label: "news-images", bucketNames: ["news-images"] },
  { label: "posters", bucketNames: ["posters"] },
  { label: "stream-assets", bucketNames: ["stream-assets"] },
  { label: "moss-files", bucketNames: ["moss-files"] },
];

const APP_CRITICAL_TABLES = [
  "users",
  "profiles",
  "seasons",
  "days",
  "teams",
  "players",
  "events",
  "matches",
  "match_players",
  "match_results",
  "event_teams",
  "pending_imports",
  "import_logs",
  "team_roster_history",
  "roster_requests",
  "match_team_results",
  "match_player_results",
  "moss_submissions",
  "uploads",
  "audit_logs",
  "announcements",
  "sponsors",
  "videos",
  "settings",
  "point_systems",
  "app_documents",
];

const LAUNCH_COMPATIBILITY_TABLES = [
  "user_profiles",
  "season_days",
  "season_standings",
  "standings",
  "player_season_stats",
  "alltime_standings",
  "media",
  "homepage_content",
  "contact_messages",
  "site_settings",
];

const DOCUMENT_STORE_COLLECTIONS = [
  "seasons",
  "tournaments",
  "standings",
  "matches",
  "teams",
  "players",
  "announcements",
  "registrations",
  "tournamentMatches",
  "scrims",
  "matchResults",
  "matchPlayers",
  "uploads",
  "siteStats",
  "streams",
  "videos",
  "sponsors",
  "pubgMatches",
  "pubgPlayers",
  "pubgImportBatches",
  "pubgImportWatchers",
  "errorLogs",
  "homepageContent",
  "newsArticles",
  "contactMessages",
  "platformGames",
  "platformEvents",
];

function loadEnvFile(filePath) {
  const env = {};

  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/g)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let [, key, value] = match;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function maskPreview(value) {
  if (!value) return null;
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getJwtShape(value) {
  const segments = value ? value.split(".") : [];
  const signature = segments.length === 3 ? segments[2] : "";

  return {
    segmentCount: segments.length,
    signatureLength: signature.length,
    looksSupabaseSecret: value.startsWith("sb_secret_"),
    looksSupabasePublishable: value.startsWith("sb_publishable_"),
    looksLikeJwt: Boolean(value) && segments.length === 3,
    looksMalformedJwt: Boolean(value) && segments.length === 3 && signature.length < 32,
  };
}

function evaluateBucketGroups(existingBuckets, bucketGroups) {
  return bucketGroups.map((group) => {
    const matchedBuckets = group.bucketNames.filter((bucket) => existingBuckets.includes(bucket));

    return {
      label: group.label,
      bucketNames: group.bucketNames,
      matchedBuckets,
      ok: matchedBuckets.length > 0,
    };
  });
}

async function safeJsonRequest(url, apiKey, label) {
  try {
    const response = await fetch(url, {
      headers: apiKey
        ? {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          }
        : undefined,
    });

    const bodyText = await response.text();
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }

    return {
      label,
      status: response.status,
      ok: response.ok,
      bodyPreview: bodyText.slice(0, 240),
      json,
    };
  } catch (error) {
    return {
      label,
      status: "ERR",
      ok: false,
      bodyPreview: error instanceof Error ? error.message : String(error),
      json: null,
    };
  }
}

async function checkTable(baseUrl, apiKey, tableName) {
  const result = await safeJsonRequest(`${baseUrl}/rest/v1/${tableName}?select=*&limit=1`, apiKey, `table:${tableName}`);

  return {
    table: tableName,
    status: result.status,
    ok: result.ok,
    missingFromSchemaCache: typeof result.bodyPreview === "string" && result.bodyPreview.includes("Could not find the table"),
  };
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });

  const env = loadEnvFile(envPath);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const authPublicKey = publishableKey || anonKey;
  const restPublicKey = anonKey || publishableKey;
  const secretKey = env.SUPABASE_SECRET_KEY || "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  const firebaseKeys = Object.keys(env).filter((key) => key.startsWith("NEXT_PUBLIC_FIREBASE_") || key.startsWith("FIREBASE_"));

  const authSettings =
    supabaseUrl && authPublicKey ? await safeJsonRequest(`${supabaseUrl}/auth/v1/settings`, authPublicKey, "auth-settings") : null;
  const publishableAuth =
    supabaseUrl && publishableKey ? await safeJsonRequest(`${supabaseUrl}/auth/v1/settings`, publishableKey, "publishable-auth") : null;
  const anonAuth = supabaseUrl && anonKey ? await safeJsonRequest(`${supabaseUrl}/auth/v1/settings`, anonKey, "anon-auth") : null;
  const privilegedKey = secretKey || serviceRoleKey;
  const serviceAuth =
    supabaseUrl && privilegedKey ? await safeJsonRequest(`${supabaseUrl}/auth/v1/settings`, privilegedKey, "service-auth") : null;
  const storageAdminKey = privilegedKey || restPublicKey;
  const bucketsResponse =
    supabaseUrl && storageAdminKey ? await safeJsonRequest(`${supabaseUrl}/storage/v1/bucket`, storageAdminKey, "storage-buckets") : null;
  const authSettingsJson = authSettings?.json ?? anonAuth?.json ?? publishableAuth?.json;

  const existingBuckets = Array.isArray(bucketsResponse?.json)
    ? bucketsResponse.json.map((bucket) => bucket.name).filter((name) => typeof name === "string")
    : [];

  const [criticalTables, launchCompatibilityTables] = await Promise.all([
    Promise.all(
      APP_CRITICAL_TABLES.map((tableName) =>
        supabaseUrl && restPublicKey
          ? checkTable(supabaseUrl, restPublicKey, tableName)
          : Promise.resolve({
              table: tableName,
              status: "SKIPPED",
              ok: false,
              missingFromSchemaCache: false,
            }),
      ),
    ),
    Promise.all(
      LAUNCH_COMPATIBILITY_TABLES.map((tableName) =>
        supabaseUrl && restPublicKey
          ? checkTable(supabaseUrl, restPublicKey, tableName)
          : Promise.resolve({
              table: tableName,
              status: "SKIPPED",
              ok: false,
              missingFromSchemaCache: false,
            }),
      ),
    ),
  ]);

  const requiredBucketGroups = evaluateBucketGroups(existingBuckets, REQUIRED_BUCKET_GROUPS);
  const recommendedBucketGroups = evaluateBucketGroups(existingBuckets, RECOMMENDED_LAUNCH_BUCKET_GROUPS);
  const serviceRoleKeyShape = getJwtShape(serviceRoleKey);

  const summary = {
    generatedAt: new Date().toISOString(),
    env: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(publishableKey),
      hasAnonKey: Boolean(anonKey),
      hasSecretKey: Boolean(secretKey),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      publicKeySource: publishableKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      restKeySource: anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : publishableKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
      serviceKeySource: secretKey ? "SUPABASE_SECRET_KEY" : serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      publishableKeyPreview: maskPreview(publishableKey),
      anonKeyPreview: maskPreview(anonKey),
      secretKeyPreview: maskPreview(secretKey),
      serviceRoleKeyPreview: maskPreview(serviceRoleKey),
      serviceRoleKeyShape,
      serviceRoleKeyWarning: serviceRoleKeyShape.looksMalformedJwt ? "Service role key looks truncated or copied incorrectly." : null,
      hasLegacyFirebaseEnv: firebaseKeys.length > 0,
      firebaseEnvKeysPresent: firebaseKeys,
    },
    auth: {
      publishableStatus: publishableAuth?.status ?? null,
      anonStatus: anonAuth?.status ?? null,
      serviceRoleStatus: serviceAuth?.status ?? null,
      disableSignup: authSettingsJson?.disable_signup ?? null,
      mailerAutoconfirm: authSettingsJson?.mailer_autoconfirm ?? null,
      phoneAutoconfirm: authSettingsJson?.phone_autoconfirm ?? null,
      emailProviderEnabled: authSettingsJson?.external?.email ?? null,
      siteUrl: authSettingsJson?.site_url ?? null,
    },
    storage: {
      bucketListStatus: bucketsResponse?.status ?? null,
      existingBuckets,
      requiredBucketGroups,
      missingBuckets: requiredBucketGroups.filter((group) => !group.ok).map((group) => group.label),
      recommendedLaunchBucketGroups: recommendedBucketGroups,
      missingRecommendedBuckets: recommendedBucketGroups.filter((group) => !group.ok).map((group) => group.label),
    },
    schema: {
      criticalTables,
      missingCriticalTables: criticalTables.filter((table) => !table.ok).map((table) => table.table),
      launchCompatibilityTables,
      missingLaunchCompatibilityTables: launchCompatibilityTables.filter((table) => !table.ok).map((table) => table.table),
      documentStoreCollections: DOCUMENT_STORE_COLLECTIONS,
      documentStoreTableReady: criticalTables.some((table) => table.table === "app_documents" && table.ok),
      documentStoreNote:
        "Homepage content, news articles, contact messages, media records, platform pages, and several admin-managed entities live inside app_documents collections rather than dedicated SQL tables.",
    },
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
