import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Run a local build/server without borrowing .env.local service credentials.
// This exercises empty/error UI and fixture browsers, not real-service acceptance.
const action = process.argv[2];
if (!["build", "start"].includes(action)) throw new Error("Use build or start.");
const environment = { ...process.env };
for (const file of [".env.example", ".env", ".env.local", ".env.staging.local", ".env.development", ".env.development.local", ".env.production", ".env.production.local"]) {
  if (existsSync(file)) for (const name of Object.keys(parseEnv(readFileSync(file, "utf8")))) environment[name] = "";
}
for (const name of Object.keys(environment)) if (/SUPABASE|R2_|PUBG_|DISCORD_|DATABASE_URL|DIRECT_URL|CRON_SECRET|VERCEL_|QA_|ADMIN_PROVISION/.test(name)) environment[name] = "";
environment.NEXT_PUBLIC_SUPABASE_URL = "https://yppefayrepkqpqtprbqa.supabase.co";
environment.NEXT_PUBLIC_SITE_URL = "http://localhost:3107";
environment.QA_AUTH_ORIGIN = "http://localhost:3107";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", action, ...(action === "build" ? ["--webpack"] : ["--port", "3107"])], { env: environment, stdio: "inherit", windowsHide: true });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 1; });
