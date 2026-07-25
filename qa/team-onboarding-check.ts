import { findTeamDuplicateCandidates, normalizeTeamIdentity } from "../lib/team-onboarding";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(normalizeTeamIdentity("  Team   HAKU!! ") === "team haku", "Name normalization failed.");
assert(normalizeTeamIdentity("Arabpati Esports") === "arabpati esport", "Esport plural normalization failed.");

const teams = [
  { id: "n3p", name: "Near Edge Protocol", tag: "N3P", captainDiscord: "n3p.igl", playerNames: ["Alpha", "Bravo"] },
  { id: "haku", name: "Team HAKU", tag: "HAKU", captainDiscord: "haku.igl", playerNames: ["Yeti"] },
  { id: "arabpati", name: "Arabpati Esports", tag: "AE", captainDiscord: "arab.igl", playerNames: [] },
  { id: "archived", name: "The Crew", tag: "TC", captainDiscord: "crew.old", playerNames: [], status: "archived" },
];

const sameTag = findTeamDuplicateCandidates(
  { name: "Near Edge Protocol / N3P", tag: "N3P", captainDiscord: "new.igl" },
  teams
);
assert(sameTag[0]?.team.id === "n3p" && sameTag[0].confidence === "high", "Same-tag team must be reviewed.");

const spellingVariant = findTeamDuplicateCandidates(
  { name: "Arabpati Esport", tag: "ARB", captainDiscord: "new.arab" },
  teams
);
assert(spellingVariant[0]?.team.id === "arabpati", "Singular/plural spelling variant must be detected.");

const sameIgl = findTeamDuplicateCandidates(
  { name: "Brand New Name", tag: "BNN", captainDiscord: "haku.igl" },
  teams
);
assert(sameIgl.some((candidate) => candidate.team.id === "haku"), "Same IGL contact must be flagged.");

const rosterOverlap = findTeamDuplicateCandidates(
  { name: "Another Team", playerNames: ["Alpha", "Other"] },
  teams
);
assert(rosterOverlap.some((candidate) => candidate.team.id === "n3p"), "Roster overlap must be flagged.");

const archived = findTeamDuplicateCandidates(
  { name: "The Crew", tag: "TC" },
  teams
);
assert(archived[0]?.team.status === "archived", "Archived identity must remain visible for owner review.");

const newTeam = findTeamDuplicateCandidates(
  { name: "Completely New Squad", tag: "CNS", captainDiscord: "new.squad" },
  teams
);
assert(newTeam.length === 0, "A genuinely new team must not be falsely blocked.");

console.log("Team onboarding normalization, duplicate, IGL, roster, archived-team, and new-team QA passed.");
