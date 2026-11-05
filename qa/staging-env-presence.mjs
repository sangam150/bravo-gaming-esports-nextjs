import { readFileSync, statSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const file = new URL("../.env.staging.local", import.meta.url);
const bytes = readFileSync(file);
const text = bytes.toString("utf8");
const parsed = parseEnv(text);
const names = [
  "VERCEL_AUTOMATION_BYPASS_SECRET",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "QA_STAGING_ADMIN_PASSWORD",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
  "QA_STAGING_TEAM_EMAIL",
  "QA_STAGING_TEAM_PASSWORD",
  "QA_STAGING_PLAYER_EMAIL",
  "QA_STAGING_PLAYER_PASSWORD",
  "PUBG_API_KEY",
  "QA_STAGING_PUBG_MATCH_ID",
];
const report = {
  checkedAt: new Date().toISOString(),
  file: fileURLToPath(file),
  modifiedAt: statSync(file).mtime.toISOString(),
  utf16Bom: (bytes[0] === 255 && bytes[1] === 254) || (bytes[0] === 254 && bytes[1] === 255),
  containsNul: text.includes("\u0000"),
  variables: Object.fromEntries(
    names.map((name) => [
      name,
      {
        entryInFile: Object.hasOwn(parsed, name),
        nonemptyInFile: Boolean(parsed[name]?.trim()),
        nonemptyInProcess: Boolean(process.env[name]?.trim()),
      },
    ]),
  ),
};
writeFileSync(new URL("../qa-artifacts/staging-verification/env-presence.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
