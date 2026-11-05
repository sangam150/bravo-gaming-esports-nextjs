import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

// Read-only repository inventory. Never reads ignored environment files.
const git = (...args) => execFileSync("git", args, { encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
const directory = "qa-artifacts/release-audit";
mkdirSync(directory, { recursive: true });
const commands = [
  ["status", "--short"], ["branch", "--show-current"], ["diff", "--stat"],
  ["diff", "--cached", "--stat"], ["diff", "--check"], ["diff", "--cached", "--check"],
  ["ls-files", "--others", "--exclude-standard"], ["diff", "--name-status"], ["diff", "--cached", "--name-status"],
];
for (const args of commands) writeFileSync(`${directory}/${args.join("_").replaceAll("--", "")}.txt`, git(...args));
const statuses = git("status", "--porcelain=v1", "-uall").trimEnd().split(/\r?\n/).filter(Boolean);
const files = statuses.map(line => {
  const file = line.slice(3);
  if (/^\.env(\.|$)/.test(file) && file !== ".env.example") throw new Error("Environment file is tracked or unignored; inspect locally.");
  const body = existsSync(file) ? readFileSync(file) : null;
  return { file, status: line.slice(0, 2), bytes: body?.length ?? 0,
    sha256: body ? createHash("sha256").update(body).digest("hex") : null,
    conflictMarker: body ? /^(<<<<<<< |=======\r?$|>>>>>>> )/m.test(body.toString("utf8")) : false };
});
const report = { checkedAt: new Date().toISOString(), branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(), total: files.length,
  tracked: files.filter(file => file.status !== "??").length,
  untrackedFiles: files.filter(file => file.status === "??").length,
  mixed: files.filter(file => file.status[0] !== " " && file.status[1] !== " " && file.status !== "??").length, files };
writeFileSync(`${directory}/inventory.json`, JSON.stringify(report, null, 2));
writeFileSync(`${directory}/intended-files.txt`, files.map(file => file.file).join("\n") + "\n");
// Already-indexed deletions have no remaining index/worktree path for git add;
// retain their existing deletion instead of passing an unmatched pathspec.
writeFileSync(`${directory}/staging-paths.txt`, files.filter(file => !(file.status[0] === "D" && !existsSync(file.file))).map(file => file.file).join("\n") + "\n");
if (process.argv.includes("--manifest")) {
  const paths = [...new Set([...files.map(file => file.file), "docs/release-file-manifest.md"])].sort();
  writeFileSync("docs/release-file-manifest.md", "# Explicit release file manifest\n\nThis is the intended staging list, including preserved pre-existing work. Ignored credentials/builds/QA artifacts are excluded. Migration 022 is included only to restore the index to its committed historical content; it should produce no final commit diff. The obsolete `supabase/schema.sql` deletion is intentional: ordered migrations remain authoritative. File-by-file hashes and mechanical checks are retained in `qa-artifacts/release-audit/`. This manifest is not a claim that real-service workflows passed.\n\n" + paths.map(file => `- \`${file}\``).join("\n") + "\n");
}
console.log(JSON.stringify({ ...report, files: undefined }, null, 2));
if (files.some(file => file.conflictMarker)) throw new Error("Unresolved conflict markers found.");
