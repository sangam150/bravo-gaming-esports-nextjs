export type TeamLogoMatchTeam = {
  aliases?: string[];
  id: string;
  name: string;
  slug?: string | null;
  tag?: string | null;
};

type TeamLogoMatchCandidate = {
  confidence: number;
  matchSource: "alias" | "id" | "name" | "slug" | "tag";
  team: TeamLogoMatchTeam;
};

export type TeamLogoMatchResult = {
  alternatives: TeamLogoMatchCandidate[];
  autoMatch: TeamLogoMatchCandidate | null;
  candidates: TeamLogoMatchCandidate[];
  normalizedFileName: string;
  normalizedLabel: string;
  originalFileName: string;
};

function removeFileExtension(value: string) {
  return value.replace(/\.[^.]+$/, "");
}

export function normalizeTeamLogoLabel(fileName: string) {
  return removeFileExtension(fileName)
    .normalize("NFKD")
    .replace(/^\s*#?\d+(?:\s+|[.)\]_-]\s*)(?=[a-zA-Z])/, "")
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamLogoIdentity(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function scoreCandidate(normalizedFileName: string, team: TeamLogoMatchTeam) {
  const values: Array<{
    confidence: number;
    matchSource: TeamLogoMatchCandidate["matchSource"];
    value: string | null | undefined;
  }> = [
    { confidence: 1, matchSource: "name", value: team.name },
    { confidence: 0.99, matchSource: "tag", value: team.tag },
    ...(team.aliases ?? []).map((alias) => ({ confidence: 0.97, matchSource: "alias" as const, value: alias })),
    { confidence: 0.95, matchSource: "slug", value: team.slug },
    { confidence: 0.93, matchSource: "id", value: team.id },
  ];

  let best: Omit<TeamLogoMatchCandidate, "team"> | null = null;
  for (const candidate of values) {
    const normalizedCandidate = normalizeTeamLogoIdentity(candidate.value ?? "");
    if (!normalizedCandidate) continue;

    let confidence = 0;
    if (normalizedCandidate === normalizedFileName) {
      confidence = candidate.confidence;
    } else if (
      normalizedCandidate.length >= 4 &&
      normalizedFileName.length >= 4 &&
      (normalizedFileName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedFileName))
    ) {
      const overlap =
        Math.min(normalizedCandidate.length, normalizedFileName.length) / Math.max(normalizedCandidate.length, normalizedFileName.length);
      confidence = Math.min(0.82, 0.62 + overlap * 0.2);
    }

    if (confidence > (best?.confidence ?? 0)) {
      best = {
        confidence,
        matchSource: candidate.matchSource,
      };
    }
  }

  return best;
}

export function matchTeamLogoFile(fileName: string, teams: readonly TeamLogoMatchTeam[]): TeamLogoMatchResult {
  const normalizedLabel = normalizeTeamLogoLabel(fileName);
  const normalizedFileName = normalizeTeamLogoIdentity(normalizedLabel);
  const candidates = teams
    .map((team) => {
      const score = scoreCandidate(normalizedFileName, team);
      return score ? { ...score, team } : null;
    })
    .filter((candidate): candidate is TeamLogoMatchCandidate => Boolean(candidate))
    .sort((first, second) => second.confidence - first.confidence || first.team.name.localeCompare(second.team.name));

  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const autoMatch = best && best.confidence >= 0.9 && (!second || best.confidence - second.confidence >= 0.05) ? best : null;

  return {
    alternatives: candidates.slice(autoMatch ? 1 : 0, 4),
    autoMatch,
    candidates,
    normalizedFileName,
    normalizedLabel,
    originalFileName: fileName,
  };
}
