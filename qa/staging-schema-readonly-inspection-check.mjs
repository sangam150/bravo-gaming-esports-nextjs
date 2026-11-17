import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./staging-schema-readonly-inspection.mjs", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("../qa-artifacts/staging-schema-readonly-inspection.mjs", import.meta.url), "utf8").trim();
const dashboard = readFileSync(new URL("./staging-schema-readonly-dashboard.sql", import.meta.url), "utf8");

assert.match(source, /const STAGING_PROJECT_REF = "yppefayrepkqpqtprbqa";/);
assert.match(source, /host === `db\.\$\{STAGING_PROJECT_REF\}\.supabase\.co`/);
assert.match(source, /\.pooler\.supabase\.(?:com|net)/);
assert.match(source, /begin isolation level repeatable read read only/i);
assert.doesNotMatch(source, /client\.query\(["'`]commit/i);
assert.match(source, /role_is_superuser/);
assert.match(source, /role_can_write_or_alter_application_relations/);
assert.match(source, /role_can_read_application_rows/);
assert.match(source, /qa-artifacts\/final-platform-execution\/staging-schema-readonly-inspection\.json/);
assert.equal(wrapper, 'import "../qa/staging-schema-readonly-inspection.mjs";');

const queryBodies = [...source.matchAll(/^  [A-Za-z][A-Za-z0-9]*: `([\s\S]*?)^  `,/gm)].map((match) => match[1]);
assert.ok(queryBodies.length >= 15, "Expected the complete catalog query inventory.");
for (const body of queryBodies) {
  assert.match(body.trim(), /^select\b/i, "Every inventory query must start with SELECT.");
  assert.doesNotMatch(body, /(?:^|;)\s*(?:insert|update|delete|alter|drop|create|truncate|grant|revoke|copy|call|do)\b/im);
}

const dashboardStatements = dashboard
  .replace(/^\s*--.*$/gm, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);
assert.ok(dashboardStatements.length >= 8);
for (const statement of dashboardStatements) {
  assert.match(statement, /^(?:begin\b|select\b|rollback\b)/i, `Unexpected Dashboard statement: ${statement.split(/\s+/)[0]}`);
}
assert.equal(dashboardStatements.at(0).toLowerCase(), "begin isolation level repeatable read read only");
assert.equal(dashboardStatements.at(-1).toLowerCase(), "rollback");

for (const artifact of [
  "qa-artifacts/staging-schema-readonly-inspection.mjs",
  "qa-artifacts/final-platform-execution/staging-schema-readonly-inspection.json",
]) {
  const ignored = execFileSync("git", ["check-ignore", artifact], { encoding: "utf8", windowsHide: true }).trim();
  assert.equal(ignored.replaceAll("\\", "/"), artifact);
}

console.log("Staging schema inspection safety checks passed.");
