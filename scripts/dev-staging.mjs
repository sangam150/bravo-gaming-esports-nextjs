import { spawn } from "node:child_process";
import { readStagingDevelopmentEnvironment } from "./lib/staging-development-environment.mjs";

try {
  const args = process.argv.slice(2);
  if (args.some(argument => !["--check", "--discord"].includes(argument))) throw new Error("Supported options: --check, --discord.");
  const discord = args.includes("--discord");
  const env = readStagingDevelopmentEnvironment({ discord });
  if (args.includes("--check")) {
    console.log(`Staging environment selection passed${discord ? " with Discord credentials" : ""}. Opaque key validity, schema, provider settings and account readiness require real service checks. No server started.`);
  } else {
    console.log(`Starting localhost:3000 with explicit staging Supabase${discord ? " and Discord guild verification" : ""}. R2 and management credentials are excluded. Discord-derived administrator access remains disabled.`);
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "localhost", "--port", "3000"], { env, stdio: "inherit", windowsHide: true });
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
    child.on("error", () => { console.error("Unable to start the local staging development process."); process.exitCode = 1; });
    child.on("exit", code => { process.exitCode = code ?? 1; });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local staging configuration failed.");
  process.exitCode = 1;
}
