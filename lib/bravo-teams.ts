import type { Team } from "./types";

type BravoCanonicalTeam = Pick<Team, "id" | "name" | "tag" | "slotNumber">;

const BRAVO_CANONICAL_TEAMS: BravoCanonicalTeam[] = [
  { id: "fyb-esports", name: "FYB Esports", tag: "FYB", slotNumber: 1 },
  { id: "mandem", name: "Mandem BoyZ", tag: "MBZ", slotNumber: 2 },
  {
    id: "the-lost-mc-esports",
    name: "The Lost MC Esports",
    tag: "LMC",
    slotNumber: 3,
  },
  { id: "fyb-fan-boy", name: "FYB FAN BOY", tag: "FYBFB", slotNumber: 4 },
  { id: "omega-tactix", name: "Omega Tactix", tag: "OTX", slotNumber: 5 },
  { id: "npl", name: "NPL", slotNumber: 6 },
  { id: "n3p", name: "N3P", slotNumber: 7 },
  { id: "team-haku", name: "Team HAKU", tag: "HAKU", slotNumber: 8 },
  { id: "lootaddicts", name: "Loot Addicts", tag: "LA", slotNumber: 9 },
  { id: "mujuverse", name: "Mujuverse", tag: "MV", slotNumber: 10 },
  { id: "lang-tang-gang-ltg", name: "LTG", tag: "LTG", slotNumber: 11 },
  { id: "kaal", name: "Kaal", slotNumber: 12 },
  { id: "bir-gorkhali", name: "Bir Gorkhali", tag: "BG", slotNumber: 13 },
  {
    id: "illumaniti-gamers",
    name: "Illumaniti Gamers",
    tag: "IG",
    slotNumber: 14,
  },
  { id: "sons", name: "Sons", slotNumber: 15 },
  { id: "ace", name: "Ace", slotNumber: 16 },
  { id: "m8", name: "M8", slotNumber: 17 },
  {
    id: "arabpati-esports",
    name: "Arabpati Esports",
    tag: "AE",
    slotNumber: 18,
  },
  { id: "gedagudi", name: "GedaGudi", tag: "GG", slotNumber: 19 },
  { id: "the-young-man", name: "The Young Man", tag: "TYM", slotNumber: 20 },
  {
    id: "aia-apex-in-action",
    name: "AIA ( APEX IN ACTION )",
    tag: "AIA",
    slotNumber: 21,
  },
  { id: "team-69", name: "Team 69", tag: "T69", slotNumber: 22 },
  { id: "fam", name: "Fam", slotNumber: 23 },
  { id: "families", name: "Families", slotNumber: 24 },
];

const bravoTeamsBySlot = new Map(BRAVO_CANONICAL_TEAMS.map((team) => [team.slotNumber ?? Number.NaN, team]));

function normalizeTeamKey(value?: string | null) {
  return value
    ?.toLowerCase()
    .replace(/^\s*\d{1,2}[\s.)\-:]+/g, "")
    .replace(/[()[\]#]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const bravoTeamsByKey = new Map<string, BravoCanonicalTeam>();

for (const team of BRAVO_CANONICAL_TEAMS) {
  bravoTeamsByKey.set(team.id, team);
  const idKey = normalizeTeamKey(team.id);
  if (idKey) {
    bravoTeamsByKey.set(idKey, team);
  }
  const nameKey = normalizeTeamKey(team.name);
  const tagKey = normalizeTeamKey(team.tag);

  if (nameKey) {
    bravoTeamsByKey.set(nameKey, team);
  }

  if (tagKey) {
    bravoTeamsByKey.set(tagKey, team);
  }
}

export function getBravoCanonicalTeams() {
  return [...BRAVO_CANONICAL_TEAMS];
}

export function getBravoCanonicalTeamIds() {
  return BRAVO_CANONICAL_TEAMS.map((team) => team.id);
}

export function parseBravoSlotNumber(value?: string | null) {
  if (!value) return undefined;

  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  const numberedNameMatch = trimmedValue.match(/^(\d{1,2})[\s.)\-:]+[a-z]/i);
  if (numberedNameMatch) {
    return Number(numberedNameMatch[1]);
  }

  const teamSlotMatch = trimmedValue.match(/(?:team|slot)\s*[-#:]*\s*(\d{1,2})/i);
  if (teamSlotMatch) {
    return Number(teamSlotMatch[1]);
  }

  if (/^\d{1,2}$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  return undefined;
}

export function buildFallbackTeamNameFromSlot(slotNumber?: number) {
  if (!Number.isFinite(slotNumber)) return undefined;
  return `Team Slot ${slotNumber}`;
}

export function resolveBravoTeamIdentity(value?: string | null) {
  const normalizedKey = normalizeTeamKey(value);
  if (normalizedKey) {
    const directMatch = bravoTeamsByKey.get(normalizedKey);
    if (directMatch) return directMatch;
  }

  const slotNumber = parseBravoSlotNumber(value);
  if (typeof slotNumber === "number") {
    return bravoTeamsBySlot.get(slotNumber) ?? null;
  }

  return null;
}

function getComparableSlotNumber(value?: { slotNumber?: number; name?: string; teamName?: string }) {
  if (typeof value?.slotNumber === "number") return value.slotNumber;
  return (
    resolveBravoTeamIdentity(value?.name)?.slotNumber ?? resolveBravoTeamIdentity(value?.teamName)?.slotNumber ?? Number.POSITIVE_INFINITY
  );
}

function getComparableName(value?: { name?: string; teamName?: string }) {
  return value?.name ?? value?.teamName ?? "";
}

export function compareBravoTeamSlotOrder(
  firstValue?: { slotNumber?: number; name?: string; teamName?: string },
  secondValue?: { slotNumber?: number; name?: string; teamName?: string },
) {
  const firstSlot = getComparableSlotNumber(firstValue);
  const secondSlot = getComparableSlotNumber(secondValue);

  if (firstSlot !== secondSlot) {
    return firstSlot - secondSlot;
  }

  return getComparableName(firstValue).localeCompare(getComparableName(secondValue));
}

export function canonicalizeBravoTeamName(value?: string | null) {
  return resolveBravoTeamIdentity(value)?.name ?? value?.trim() ?? "Unknown";
}
