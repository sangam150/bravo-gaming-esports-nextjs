import { readFileSync } from "node:fs";

export const EXPECTED_SUPABASE_PROJECT_REF = "hldppfhtkfgthainismr";

const SUPABASE_ROOT_CA = readFileSync(new URL("../../config/certs/supabase-prod-ca-2021.crt", import.meta.url), "utf8");

export function getVerifiedDatabaseConnection(
  configuredValue,
  name = "Database connection",
  expectedProjectRef = EXPECTED_SUPABASE_PROJECT_REF,
) {
  if (typeof configuredValue !== "string" || !configuredValue.trim()) {
    throw new Error(`${name} is missing.`);
  }

  const url = new URL(configuredValue.trim());
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${name} must use PostgreSQL.`);
  }

  const hostnameSegments = url.hostname.toLowerCase().split(".");
  const usernameSegments = decodeURIComponent(url.username).toLowerCase().split(".");
  if (!/^[a-z0-9]{20}$/.test(expectedProjectRef)) throw new Error("A valid explicit Supabase project reference is required.");
  if (!hostnameSegments.includes(expectedProjectRef) && !usernameSegments.includes(expectedProjectRef)) {
    throw new Error(`${name} does not belong to the authoritative Supabase project.`);
  }

  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(parameter);
  }

  return {
    connectionString: url.toString(),
    hostname: url.hostname,
    port: url.port || "5432",
    ssl: {
      ca: SUPABASE_ROOT_CA,
      rejectUnauthorized: true,
      servername: url.hostname,
    },
  };
}
