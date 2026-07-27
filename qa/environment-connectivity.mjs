import { createHash } from "node:crypto";
import pg from "pg";

const expectedProjectRef = "hldppfhtkfgthainismr";
const { Client } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function describeConnection(name) {
  const value = required(name);
  const url = new URL(value);
  return {
    name,
    host: url.hostname,
    port: url.port || "5432",
    fingerprint: fingerprint(value),
  };
}

async function verifyPostgres(name) {
  const connectionString = required(name);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  try {
    const result = await client.query("select current_database() as database_name, current_user as database_user");
    return {
      ...describeConnection(name),
      connected: true,
      database: result.rows[0]?.database_name ?? null,
      user: result.rows[0]?.database_user ?? null,
    };
  } finally {
    await client.end();
  }
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
if (projectRef !== expectedProjectRef) {
  throw new Error(`Unexpected Supabase project ref: ${projectRef}`);
}

const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = process.env.SUPABASE_SECRET_KEY?.trim() || required("SUPABASE_SERVICE_ROLE_KEY");

const [directResult, pooledResult, authSettings, storageBuckets] = await Promise.all([
  verifyPostgres("DIRECT_URL").catch((error) => ({
    ...describeConnection("DIRECT_URL"),
    connected: false,
    error: error instanceof Error ? error.message : "connection_failed",
  })),
  verifyPostgres("DATABASE_URL").catch((error) => ({
    ...describeConnection("DATABASE_URL"),
    connected: false,
    error: error instanceof Error ? error.message : "connection_failed",
  })),
  fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publicKey },
    cache: "no-store",
  }),
  fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    cache: "no-store",
  }),
]);

const settings = authSettings.ok ? await authSettings.json() : null;
const buckets = storageBuckets.ok ? await storageBuckets.json() : null;

console.log(
  JSON.stringify({
    projectRef,
    supabaseHost: new URL(supabaseUrl).hostname,
    publicKeyFingerprint: fingerprint(publicKey),
    serviceKeyFingerprint: fingerprint(serviceKey),
    direct: directResult,
    pooled: pooledResult,
    auth: {
      status: authSettings.status,
      email: settings?.external?.email === true,
      discord: settings?.external?.discord === true,
    },
    storage: {
      status: storageBuckets.status,
      bucketCount: Array.isArray(buckets) ? buckets.length : null,
    },
  }),
);
