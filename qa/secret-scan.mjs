import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const staged = process.argv.includes("--staged");
const candidateFiles = execFileSync("git", staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"] : ["ls-files", "-co", "--exclude-standard"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const binaryExtensions = new Set([".avif", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".png", ".ttf", ".webm", ".webp", ".woff", ".woff2"]);

const detectors = [
  { name: "private-key", pattern: /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/g },
  { name: "database-credential", pattern: /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@/]+@[^\s/]+/gi },
  { name: "jwt", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "aws-access-key", pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g },
  { name: "github-token", pattern: /gh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}/g },
  { name: "slack-token", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/g },
  { name: "supabase-secret", pattern: /sb_secret_[A-Za-z0-9_-]{20,}/g },
  {
    name: "assigned-secret",
    pattern:
      /(?:client[_-]?secret|service[_-]?role[_-]?(?:key|secret)|discord[_-]?(?:bot[_-]?)?token|database[_-]?password)\s*[:=]\s*["'](?!\$\{|<|your[-_]|replace[-_]|example|process\.env)[A-Za-z0-9_+/.=-]{16,}["']/gi,
  },
];

const findings = [];
for (const file of candidateFiles) {
  const extensionIndex = file.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? file.slice(extensionIndex).toLowerCase() : "";
  if (binaryExtensions.has(extension)) continue;

  let source;
  try {
    const buffer = staged ? execFileSync("git", ["show", `:${file}`], { maxBuffer: 8 * 1024 * 1024, windowsHide: true }) : await readFile(file);
    if (buffer.byteLength > 5 * 1024 * 1024 || buffer.includes(0)) continue;
    source = buffer.toString("utf8");
  } catch {
    continue;
  }

  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    if (detector.pattern.test(source)) {
      findings.push({ detector: detector.name, file });
    }
  }
}

if (findings.length > 0) {
  console.error(`Secret scan found ${findings.length} potential credential-bearing file(s).`);
  for (const finding of findings) {
    console.error(`${finding.detector}: ${finding.file}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed across ${candidateFiles.length} ${staged ? "staged" : "tracked and candidate"} files; no credential patterns detected.`);
}
