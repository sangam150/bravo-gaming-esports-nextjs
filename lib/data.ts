import {
  COLLECTIONS,
  createFirestoreDocument,
  deleteFirestoreDocument,
  fetchFirestoreCollection,
  getFirestoreDocument,
  isFirebaseConfigured,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import {
  seedAnnouncements,
  seedPlayers,
  seedStats,
  seedStreams,
  seedTeams,
  seedTournaments,
  seedVideos,
} from "./seed-data";
import type {
  Announcement,
  LeaderboardRow,
  Player,
  Scrim,
  SiteStats,
  StreamSchedule,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMatch,
  VideoItem,
} from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fromFirestoreOrSeed<T>(collection: string, seed: T[], sortFn?: (a: T & { id: string }, b: T & { id: string }) => number): Promise<(T & { id: string })[]> {
  if (!isFirebaseConfigured()) return seed as (T & { id: string })[];
  try {
    const docs = await fetchFirestoreCollection<T>(collection);
    if (docs.length === 0) return seed as (T & { id: string })[];
    return sortFn ? [...docs].sort(sortFn) : docs;
  } catch {
    return seed as (T & { id: string })[];
  }
}

async function oneFromFirestoreOrSeed<T extends { id: string }>(collection: string, id: string, seed: T[]): Promise<T | null> {
  if (!isFirebaseConfigured()) return seed.find((item) => item.id === id) ?? null;
  try {
    const doc = await getFirestoreDocument<T>(collection, id);
    if (doc) return doc;
    return seed.find((item) => item.id === id) ?? null;
  } catch {
    return seed.find((item) => item.id === id) ?? null;
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  if (!isFirebaseConfigured()) return seedStats;
  try {
    const doc = await getFirestoreDocument<SiteStats>(COLLECTIONS.siteStats, "main");
    return doc ?? seedStats;
  } catch {
    return seedStats;
  }
}

export async function getTournaments(status?: string): Promise<Tournament[]> {
  const all = await fromFirestoreOrSeed<Tournament>(COLLECTIONS.tournaments, seedTournaments);
  if (!status) return all;
  return all.filter((t) => t.status === status);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.tournaments, id, seedTournaments);
}

export async function saveTournament(data: Partial<Tournament> & { title: string }, id?: string) {
  const docId = id ?? slugify(data.title);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.tournaments, docId, data as Record<string, unknown>);
  }
  return { id: docId, ...data };
}

export async function deleteTournament(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.tournaments, id);
  }
  return { id, deleted: true };
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const matches = await queryFirestoreCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId);
    return matches.filter((m) => m.dataSource === "pubg_api" || m.syncedAt);
  } catch {
    return [];
  }
}

export async function getScrims(): Promise<Scrim[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    return await fetchFirestoreCollection(COLLECTIONS.scrims, 100);
  } catch {
    return [];
  }
}

export async function saveTournamentMatch(data: TournamentMatch) {
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.tournamentMatches, data.id, data as unknown as Record<string, unknown>);
  }
  return data;
}

export async function getTeams(): Promise<Team[]> {
  return fromFirestoreOrSeed<Team>(COLLECTIONS.teams, seedTeams, (a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

export async function getTeam(id: string): Promise<Team | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.teams, id, seedTeams);
}

export async function saveTeam(data: Partial<Team> & { name: string }, id?: string) {
  const docId = id ?? slugify(data.name);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.teams, docId, data as Record<string, unknown>);
  }
  return { id: docId, ...data };
}

export async function deleteTeam(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.teams, id);
  }
  return { id, deleted: true };
}

export async function getPlayers(): Promise<Player[]> {
  return fromFirestoreOrSeed<Player>(COLLECTIONS.players, seedPlayers, (a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

export async function getPlayer(id: string): Promise<Player | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.players, id, seedPlayers);
}

export async function getMvpOfWeek(): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((p) => p.isMvpOfWeek) ?? players[0] ?? null;
}

export async function savePlayer(data: Partial<Player> & { name: string }, id?: string) {
  const docId = id ?? slugify(data.name);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.players, docId, data as Record<string, unknown>);
  }
  return { id: docId, ...data };
}

export async function deletePlayer(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.players, id);
  }
  return { id, deleted: true };
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const teams = await fetchFirestoreCollection<Team>(COLLECTIONS.teams, 200);
    const withLiveData = teams.filter((t) => (t.matches ?? 0) > 0);
    if (withLiveData.length === 0) return [];
    return [...withLiveData]
      .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
      .map((t, i) => ({
        rank: i + 1,
        teamId: t.id,
        team: t.name,
        matches: t.matches,
        kills: t.kills,
        placement: t.placementPoints ?? 0,
        points: t.totalPoints,
      }));
  } catch {
    return [];
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const all = await fromFirestoreOrSeed<Announcement>(COLLECTIONS.announcements, seedAnnouncements);
  return all.filter((a) => a.published !== false);
}

export async function saveAnnouncement(data: Partial<Announcement> & { title: string; detail: string }, id?: string) {
  const docId = id ?? `ann-${Date.now()}`;
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.announcements, docId, data as Record<string, unknown>);
  }
  return { id: docId, ...data };
}

export async function deleteAnnouncement(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.announcements, id);
  }
  return { id, deleted: true };
}

export async function getStreams(): Promise<StreamSchedule[]> {
  return fromFirestoreOrSeed(COLLECTIONS.streams, seedStreams);
}

export async function getVideos(): Promise<VideoItem[]> {
  return fromFirestoreOrSeed(COLLECTIONS.videos, seedVideos);
}

export async function getRegistrations(): Promise<TeamRegistration[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    return await fetchFirestoreCollection<TeamRegistration>(COLLECTIONS.registrations);
  } catch {
    return [];
  }
}

export async function createRegistration(data: Omit<TeamRegistration, "id" | "createdAt" | "status">) {
  const payload = {
    ...data,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  if (isFirebaseConfigured()) {
    const result = await createFirestoreDocument(COLLECTIONS.registrations, payload);
    return { id: result.id, ...payload };
  }
  return { id: `reg-${Date.now()}`, ...payload };
}

export async function updateRegistrationStatus(id: string, status: TeamRegistration["status"]) {
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.registrations, id, { status });
  }
  return { id, status };
}

export async function registerTeamForTournament(tournamentId: string, teamId: string) {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.teamCount >= tournament.maxTeams) throw new Error("Tournament is full");
  const registered = [...(tournament.registeredTeamIds ?? []), teamId];
  const updated = {
    ...tournament,
    registeredTeamIds: registered,
    teamCount: registered.length,
  };
  await saveTournament(updated, tournamentId);
  return updated;
}

export async function seedFirestore() {
  if (!isFirebaseConfigured()) {
    return { seeded: false, message: "Firebase not configured — using local seed data" };
  }

  await saveFirestoreDocument(COLLECTIONS.siteStats, "main", seedStats as unknown as Record<string, unknown>);

  for (const t of seedTournaments) {
    const { id, ...rest } = t;
    await saveFirestoreDocument(COLLECTIONS.tournaments, id, rest as unknown as Record<string, unknown>);
  }
  for (const t of seedTeams) {
    const { id, ...rest } = t;
    await saveFirestoreDocument(COLLECTIONS.teams, id, rest as unknown as Record<string, unknown>);
  }
  for (const p of seedPlayers) {
    const { id, ...rest } = p;
    await saveFirestoreDocument(COLLECTIONS.players, id, rest as unknown as Record<string, unknown>);
  }
  for (const a of seedAnnouncements) {
    const { id, ...rest } = a;
    await saveFirestoreDocument(COLLECTIONS.announcements, id, rest as unknown as Record<string, unknown>);
  }
  return { seeded: true, message: "Firestore seeded with teams, players, and tournaments. Match results import from live PUBG API only." };
}

export async function getAdminDashboardStats() {
  const [teams, players, tournaments, registrations, scrims] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(),
    getRegistrations(),
    getScrims(),
  ]);

  const completedTournaments = tournaments.filter((t) => t.status === "COMPLETED").length;
  const liveTournaments = tournaments.filter((t) => t.status === "LIVE").length;
  const totalMatches = teams.reduce((sum, t) => sum + (t.matches ?? 0), 0);
  const pendingRegistrations = registrations.filter((r) => r.status === "pending").length;

  let recentUploads: { id: string; type: string; uploadedAt: string }[] = [];
  if (isFirebaseConfigured()) {
    try {
      const uploads = await fetchFirestoreCollection<{ id: string; type: string; uploadedAt: string }>(COLLECTIONS.uploads, 5);
      recentUploads = uploads.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    } catch {
      recentUploads = [];
    }
  }

  return {
    totalTeams: teams.length,
    totalPlayers: players.length,
    totalScrims: scrims.length,
    matchesPlayed: totalMatches,
    totalTournaments: tournaments.length,
    completedTournaments,
    liveTournaments,
    pendingRegistrations,
    recentRegistrations: registrations.slice(0, 5),
    recentUploads,
    firebaseConnected: isFirebaseConfigured(),
  };
}
