export type TeamIdentityInput = {
  id?: string;
  name: string;
  tag?: string | null;
  captainDiscord?: string | null;
  captainEmail?: string | null;
  playerNames?: string[] | null;
  status?: string | null;
};

export type TeamDuplicateCandidate = {
  team: TeamIdentityInput;
  confidence: "exact" | "high" | "possible";
  reasons: string[];
};

const GENERIC_TEAM_WORDS = new Set(["team", "esport", "esports", "gaming", "the"]);

export function normalizeTeamIdentity(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\besports?\b/g, " esport ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityTokens(value: string) {
  return new Set(
    normalizeTeamIdentity(value)
      .split(" ")
      .filter((token) => token && !GENERIC_TEAM_WORDS.has(token)),
  );
}

function tokenSimilarity(first: string, second: string) {
  const firstTokens = identityTokens(first);
  const secondTokens = identityTokens(second);
  if (!firstTokens.size || !secondTokens.size) return 0;
  const intersection = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  return intersection / Math.max(firstTokens.size, secondTokens.size);
}

function normalizedOptional(value?: string | null) {
  return value ? normalizeTeamIdentity(value) : "";
}

export function findTeamDuplicateCandidates(incoming: TeamIdentityInput, existingTeams: TeamIdentityInput[]): TeamDuplicateCandidate[] {
  const incomingName = normalizeTeamIdentity(incoming.name);
  const incomingTag = normalizedOptional(incoming.tag);
  const incomingDiscord = normalizedOptional(incoming.captainDiscord);
  const incomingEmail = incoming.captainEmail?.trim().toLowerCase() ?? "";
  const incomingPlayers = new Set((incoming.playerNames ?? []).map(normalizeTeamIdentity).filter(Boolean));

  return existingTeams
    .map((team): TeamDuplicateCandidate | null => {
      const reasons: string[] = [];
      const exactName = normalizeTeamIdentity(team.name) === incomingName;
      const exactTag = Boolean(incomingTag && normalizedOptional(team.tag) === incomingTag);
      const sameDiscord = Boolean(incomingDiscord && normalizedOptional(team.captainDiscord) === incomingDiscord);
      const sameEmail = Boolean(incomingEmail && team.captainEmail?.trim().toLowerCase() === incomingEmail);
      const overlap = (team.playerNames ?? []).map(normalizeTeamIdentity).filter((player) => player && incomingPlayers.has(player)).length;
      const nameSimilarity = tokenSimilarity(incoming.name, team.name);

      if (exactName) reasons.push("same normalized team name");
      if (exactTag) reasons.push("same normalized team tag");
      if (sameDiscord) reasons.push("same IGL Discord contact");
      if (sameEmail) reasons.push("same IGL email");
      if (overlap > 0) reasons.push(`${overlap} overlapping roster name${overlap === 1 ? "" : "s"}`);
      if (!exactName && nameSimilarity >= 0.6) reasons.push("similar normalized team name");
      if (!reasons.length) return null;

      const confidence =
        exactName || (exactTag && (sameDiscord || sameEmail || overlap > 0))
          ? "exact"
          : exactTag || sameDiscord || sameEmail || overlap >= 2
            ? "high"
            : "possible";
      return { team, confidence, reasons };
    })
    .filter((candidate): candidate is TeamDuplicateCandidate => Boolean(candidate))
    .sort((first, second) => {
      const rank = { exact: 0, high: 1, possible: 2 };
      return rank[first.confidence] - rank[second.confidence];
    });
}
