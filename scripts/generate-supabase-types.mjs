import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const envPath = resolve(cwd, ".env.local");

if (!existsSync(envPath)) {
  throw new Error("Missing .env.local. Add NEXT_PUBLIC_SUPABASE_URL before generating Supabase types.");
}

const envText = readFileSync(envPath, "utf8");
const urlLine = envText
  .split(/\r?\n/g)
  .map((line) => line.trim())
  .find((line) => line.startsWith("NEXT_PUBLIC_SUPABASE_URL="));

if (!urlLine) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  throw new Error("SUPABASE_ACCESS_TOKEN is required to run `npm run supabase:types`.");
}

const projectUrl = urlLine.slice("NEXT_PUBLIC_SUPABASE_URL=".length).trim();
const projectId = new URL(projectUrl).host.split(".")[0];
const output = execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["supabase", "gen", "types", "typescript", "--project-id", projectId, "--schema", "public"],
  {
    cwd,
    encoding: "utf8",
    env: process.env,
    shell: process.platform === "win32",
    maxBuffer: 8 * 1024 * 1024,
  }
);

writeFileSync(resolve(cwd, "types/database.types.ts"), output);
process.stdout.write(`Generated types/database.types.ts from project ${projectId}.\n`);
