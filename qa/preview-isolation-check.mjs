import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import policy from "../lib/preview-resource-policy.js";

// Offline metadata and real config-reader checks only. No env files, owner
// credentials, network requests, migrations or deployments are used.
const stagingRef = "yppefayrepkqpqtprbqa";
const productionOrigin = "https://hldppfhtkfgthainismr.supabase.co";
const good = {
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example-offline",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SECRET_KEY: "sb_secret_example-offline",
  SUPABASE_SERVICE_ROLE_KEY: "",
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_ACCESS_KEY_ID: "example-offline-access",
  R2_SECRET_ACCESS_KEY: "example-offline-storage",
  R2_BUCKET_NAME: "bravo-gaming-staging-assets",
  R2_PRIVATE_BUCKET_NAME: "bravo-gaming-staging-private",
  R2_PUBLIC_BASE_URL: "https://staging-assets.example.invalid",
};
const jwt = (ref, role, exp) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ ref, role, ...(exp === undefined ? {} : { exp }) })).toString("base64url")}.example-signature`;
const legacy = { ...good, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SECRET_KEY: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(stagingRef, "anon"), SUPABASE_SERVICE_ROLE_KEY: jwt(stagingRef, "service_role") };
policy.assertPreviewResourceEnvironment(good);
policy.assertPreviewResourceEnvironment(legacy);
policy.assertPreviewResourceEnvironment({ ...good, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: productionOrigin, R2_BUCKET_NAME: "bravo-gaming-assets", R2_PRIVATE_BUCKET_NAME: "bravo-gaming-private" });
policy.assertPreviewResourceEnvironment({ ...good, VERCEL_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: productionOrigin });
policy.assertPreviewR2Environment({ VERCEL_ENV: "preview" });

for (const url of [productionOrigin, "https://another.supabase.co", "http://yppefayrepkqpqtprbqa.supabase.co", `${good.NEXT_PUBLIC_SUPABASE_URL}/other`, `${good.NEXT_PUBLIC_SUPABASE_URL}?token=example`, "https://example:example@yppefayrepkqpqtprbqa.supabase.co"])
  assert.throws(() => policy.assertPreviewSupabaseEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_URL: url }), /Vercel Preview/);
for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_example-wrong-kind"],
  ["SUPABASE_SECRET_KEY", "sb_publishable_example-wrong-kind"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", jwt("hldppfhtkfgthainismr", "anon")],
  ["SUPABASE_SERVICE_ROLE_KEY", jwt(stagingRef, "anon")],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", jwt(stagingRef, "service_role")],
  ["SUPABASE_SERVICE_ROLE_KEY", jwt(stagingRef, "service_role", 1)],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJbroken.example.example"],
]) assert.throws(() => policy.assertPreviewSupabaseEnvironment({ ...good, [name]: value }), /Vercel Preview/);
for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"])
  assert.throws(() => policy.assertPreviewSupabaseEnvironment({ ...good, [name]: "" }), /Vercel Preview requires/);
for (const [name, value] of [
  ["R2_BUCKET_NAME", "bravo-gaming-assets"], ["R2_PRIVATE_BUCKET_NAME", "bravo-gaming-private"],
  ["R2_BUCKET_NAME", "BRAVO-GAMING-PRIVATE"], ["R2_PRIVATE_BUCKET_NAME", good.R2_BUCKET_NAME],
  ["R2_BUCKET_NAME", ""], ["R2_ACCOUNT_ID", "invalid-account"],
  ["R2_ENDPOINT", `http://${good.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`],
  ["R2_ENDPOINT", `https://${"b".repeat(32)}.r2.cloudflarestorage.com`],
  ["R2_ENDPOINT", "https://another.example.invalid"],
]) assert.throws(() => policy.assertPreviewR2Environment({ ...good, [name]: value }), /Vercel Preview/);

function localEnvironment(overrides) {
  const environment = {};
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA"])
    if (process.env[name]) environment[name] = process.env[name];
  return { ...environment, ...overrides };
}

const configPath = path.resolve("next.config.js");
const directory = path.resolve("qa-artifacts/preview-policy-check");
const configProject = path.join(directory, "config-project");
mkdirSync(configProject, { recursive: true });
// The installed Next loader reads a task-owned directory with no .env files.
// Its wrapper exports the real project configuration function unchanged.
writeFileSync(path.join(configProject, "next.config.js"), `module.exports = require(${JSON.stringify(configPath)});\n`);
const configCases = [
  [good, true], [legacy, true],
  [{ ...good, NEXT_PUBLIC_SUPABASE_URL: productionOrigin }, false],
  [{ ...good, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }, false],
  [{ ...good, SUPABASE_SERVICE_ROLE_KEY: jwt(stagingRef, "anon") }, false],
  [{ ...good, R2_BUCKET_NAME: "bravo-gaming-assets" }, false],
  [{ ...good, R2_PRIVATE_BUCKET_NAME: "bravo-gaming-private" }, false],
];
for (const [environment, allowed] of configCases) {
  const result = spawnSync(process.execPath, ["-e", "globalThis.fetch=()=>{throw Error('Unexpected config network request')};const load=require('next/dist/server/config').default;const phase=require('next/constants').PHASE_PRODUCTION_BUILD;load(phase,process.argv[1]).then(config=>{if(typeof config.headers!=='function'||!config.images.remotePatterns.length)throw Error('Configuration body was lost');process.stdout.write('config-loaded')}).catch(error=>{console.error(error.message);process.exitCode=1});", configProject], { env: localEnvironment(environment), encoding: "utf8", windowsHide: true });
  assert.equal(result.status, allowed ? 0 : 1, "The actual Next config must reject unsafe Preview bindings before loading.");
  assert.equal(result.stdout.includes("config-loaded"), allowed);
  if (!allowed) assert.match(result.stderr, /Vercel Preview/);
  for (const value of [good.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, good.SUPABASE_SECRET_KEY, good.R2_ACCESS_KEY_ID, good.R2_SECRET_ACCESS_KEY])
    assert.equal(`${result.stdout}${result.stderr}`.includes(value), false, "Config errors must not print credential values.");
}

mkdirSync(directory, { recursive: true });
const outfile = path.join(directory, "actual-readers.mjs");
await build({
  stdin: { resolveDir: process.cwd(), loader: "ts", contents: `
    import assert from 'node:assert/strict';
    import {requireSupabaseEnv} from './lib/supabase/env';
    import {requireSupabaseServiceRoleEnv} from './lib/supabase/server-env';
    import {getR2PublicBucketName} from './lib/r2/client';
    globalThis.fetch=()=>{throw Error('Network is forbidden in preview-reader QA')};
    const scenario=process.argv[2];
    if(scenario==='valid'){
      assert.equal(requireSupabaseEnv().url,'https://yppefayrepkqpqtprbqa.supabase.co');
      assert.equal(requireSupabaseServiceRoleEnv().serviceRoleKey,'sb_secret_example-offline');
      assert.equal(getR2PublicBucketName(),'bravo-gaming-staging-assets');
    } else if(scenario==='supabase-rejected'){
      for(const read of [requireSupabaseEnv,requireSupabaseServiceRoleEnv]) assert.throws(read,error=>error.name==='AuthBackendConfigurationError' && /Vercel Preview/.test(error.message));
    } else if(scenario==='storage-rejected') assert.throws(getR2PublicBucketName,/Vercel Preview/);
    else throw Error('Unknown offline scenario');
  ` },
  outfile, bundle: true, platform: "node", format: "esm", external: ["@aws-sdk/client-s3"],
  plugins: [{ name: "offline-server-marker", setup(builder) {
    builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "marker", namespace: "offline" }));
    builder.onLoad({ filter: /.*/, namespace: "offline" }, () => ({ contents: "", loader: "js" }));
  } }],
});
const runtimeCases = [
  ["valid", good],
  ["supabase-rejected", { ...good, NEXT_PUBLIC_SUPABASE_URL: productionOrigin }],
  ["supabase-rejected", { ...good, SUPABASE_SECRET_KEY: "sb_publishable_example-wrong-kind" }],
  ["storage-rejected", { ...good, R2_BUCKET_NAME: "bravo-gaming-assets" }],
  ["storage-rejected", { ...good, R2_PRIVATE_BUCKET_NAME: "bravo-gaming-private" }],
];
for (const [scenario, environment] of runtimeCases) {
  const result = spawnSync(process.execPath, [outfile, scenario], { env: localEnvironment(environment), encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, `Actual ${scenario} reader regression failed: ${result.stderr}`);
  assert.equal(result.stdout, "");
}
console.log("PASS: Preview config blocks production/other Supabase targets, wrong key roles and inherited legacy fallbacks before build; actual runtime readers preserve safe 503 classification and reject production R2 buckets. Offline only; resolved Vercel bindings, opaque-key ownership and R2 token scopes still require real verification.");
