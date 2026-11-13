import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { readStagingDevelopmentEnvironment } from "./lib/staging-development-environment.mjs";
import { STAGING_PROJECT_REF } from "../qa/staging-target.mjs";

try {
  const args = process.argv.slice(2);
  const refs = args.filter(argument => argument.startsWith("--project-ref="));
  if (refs.length > 1) throw new Error("Use one explicit --project-ref at most.");
  if (refs.some(argument => argument !== `--project-ref=${STAGING_PROJECT_REF}`))
    throw new Error("The staging provisioning command cannot target another Supabase project.");
  if (args.some(argument => /^(--password=|--access-token=|--service-role-key=)/i.test(argument)))
    throw new Error("Secrets must be read privately from the ignored staging file, never command-line values.");
  const supported = new Set(["email", "role", "project-ref", "confirm", "create-if-missing", "password-env", "allow-existing-profile-change"]);
  const seen = new Set();
  for (const argument of args) {
    const name = argument === "--check" ? "check" : /^--([a-z-]+)=.*$/.exec(argument)?.[1];
    if (!name || (name !== "check" && !supported.has(name)) || seen.has(name))
      throw new Error("Use unique supported --name=value arguments, or --check for environment inspection.");
    seen.add(name);
  }
  const environment = readStagingDevelopmentEnvironment();
  const passwordEnv = args.find(argument => argument.startsWith("--password-env="))?.slice("--password-env=".length) ?? "ADMIN_PROVISION_PASSWORD";
  if (!["ADMIN_PROVISION_PASSWORD", "QA_STAGING_ADMIN_PASSWORD"].includes(passwordEnv))
    throw new Error("The staging wrapper accepts only ADMIN_PROVISION_PASSWORD or QA_STAGING_ADMIN_PASSWORD for --password-env.");
  const staging = parseEnv(readFileSync(".env.staging.local", "utf8"));
  environment[passwordEnv] = staging[passwordEnv] || "";
  if (args.includes("--check")) {
    console.log("Staging provisioning environment is isolated. No account or profile request performed.");
  } else {
    const forwarded = args.filter(argument => !argument.startsWith("--project-ref="));
    const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/provision-admin.ts", ...forwarded, `--project-ref=${STAGING_PROJECT_REF}`], { env: environment, stdio: "inherit", windowsHide: true });
    child.on("error", () => { console.error("Unable to start the staging provisioning command."); process.exitCode = 1; });
    child.on("exit", code => { process.exitCode = code ?? 1; });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Staging provisioning setup failed.");
  process.exitCode = 1;
}
