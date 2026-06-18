import { randomUUID } from "crypto";
import {
  COLLECTIONS,
  fetchDocumentCollection,
  getDocument,
  isDocumentStoreConfigured,
  saveDocument,
} from "./document-store";
import {
  ensureUniqueDocumentSlug,
  filterSoftDeleted,
  getDocumentByIdOrSlug,
  softDeleteDocumentEntity,
} from "./document-entities";
import { slugify } from "./slug-utils";

export type ManagedPlatformGameStatus = "flagship" | "active" | "building" | "planned";
export type ManagedPlatformEventStatus = "live" | "upcoming" | "completed" | "planned";
export type ManagedPlatformContentState = "published" | "planned" | "coming_soon";

export interface ManagedPlatformGameRecord {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  summary: string;
  status: ManagedPlatformGameStatus;
  flagship: boolean;
  heroLabel: string;
  primaryHref: string;
  analyticsHref?: string;
  sections: string[];
  completionLabel: string;
  activeEvents?: number;
  trackedMatches?: number;
  trackedTeams?: number;
  trackedPlayers?: number;
  featuredNewsCount?: number;
  published: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedPlatformEventRecord {
  id: string;
  slug: string;
  name: string;
  gameSlug: string;
  gameName: string;
  type: string;
  status: ManagedPlatformEventStatus;
  state: ManagedPlatformContentState;
  featured: boolean;
  region: string;
  organizerName: string;
  prizePool: string;
  teamsCount: number;
  matchesCount: number;
  startDate: string;
  endDate?: string;
  bannerUrl?: string;
  summary: string;
  analyticsHref?: string;
  streamHref?: string;
  topTeamName?: string;
  topPlayerName?: string;
  sponsorName?: string;
  pointSystemId?: string;
  pointSystemName?: string;
  tabs: string[];
  published: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | string | null) {
  const normalizedValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(/[\n,]+/g)
      : [];

  return Array.from(new Set(normalizedValues.map((value) => value.trim()).filter(Boolean)));
}

function normalizeManagedPlatformGame(
  data: Omit<Partial<ManagedPlatformGameRecord>, "sections"> & { name: string; sections?: string[] | string }
): ManagedPlatformGameRecord {
  const now = new Date().toISOString();
  const name = data.name.trim();

  return {
    id: cleanString(data.id) ?? randomUUID(),
    slug: cleanString(data.slug) ?? slugify(name),
    name,
    shortName: cleanString(data.shortName) ?? name,
    tagline: cleanString(data.tagline) ?? "Bravo game hub",
    summary:
      cleanString(data.summary) ??
      "Published from admin to power the Bravo Gaming multi-title platform directory.",
    status: data.status ?? "planned",
    flagship: Boolean(data.flagship),
    heroLabel: cleanString(data.heroLabel) ?? "Game Hub",
    primaryHref: cleanString(data.primaryHref) ?? `/games/${cleanString(data.slug) ?? slugify(name)}`,
    analyticsHref: cleanString(data.analyticsHref),
    sections: cleanStringArray(data.sections),
    completionLabel: cleanString(data.completionLabel) ?? "Hub ready",
    activeEvents: typeof data.activeEvents === "number" ? data.activeEvents : undefined,
    trackedMatches: typeof data.trackedMatches === "number" ? data.trackedMatches : undefined,
    trackedTeams: typeof data.trackedTeams === "number" ? data.trackedTeams : undefined,
    trackedPlayers: typeof data.trackedPlayers === "number" ? data.trackedPlayers : undefined,
    featuredNewsCount: typeof data.featuredNewsCount === "number" ? data.featuredNewsCount : undefined,
    published: data.published !== false,
    createdAt: cleanString(data.createdAt) ?? now,
    updatedAt: now,
  };
}

function normalizeManagedPlatformEvent(
  data: Omit<Partial<ManagedPlatformEventRecord>, "tabs"> & { name: string; tabs?: string[] | string }
): ManagedPlatformEventRecord {
  const now = new Date().toISOString();
  const name = data.name.trim();

  return {
    id: cleanString(data.id) ?? randomUUID(),
    slug: cleanString(data.slug) ?? slugify(name),
    name,
    gameSlug: cleanString(data.gameSlug) ?? "pubg-pc",
    gameName: cleanString(data.gameName) ?? "PUBG PC",
    type: cleanString(data.type) ?? "tournament",
    status: data.status ?? "upcoming",
    state: data.state ?? "published",
    featured: Boolean(data.featured),
    region: cleanString(data.region) ?? "Nepal",
    organizerName: cleanString(data.organizerName) ?? "Bravo Gaming Esports",
    prizePool: cleanString(data.prizePool) ?? "TBD",
    teamsCount: typeof data.teamsCount === "number" ? data.teamsCount : 0,
    matchesCount: typeof data.matchesCount === "number" ? data.matchesCount : 0,
    startDate: cleanString(data.startDate) ?? now,
    endDate: cleanString(data.endDate),
    bannerUrl: cleanString(data.bannerUrl),
    summary:
      cleanString(data.summary) ??
      "Published from admin to power the Bravo Gaming event hub with fully managed public context.",
    analyticsHref: cleanString(data.analyticsHref),
    streamHref: cleanString(data.streamHref),
    topTeamName: cleanString(data.topTeamName),
    topPlayerName: cleanString(data.topPlayerName),
    sponsorName: cleanString(data.sponsorName),
    pointSystemId: cleanString(data.pointSystemId),
    pointSystemName: cleanString(data.pointSystemName),
    tabs: cleanStringArray(data.tabs),
    published: data.published !== false,
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt) ?? now,
    updatedAt: now,
  };
}

function compareDateDesc<T extends { updatedAt?: string; startDate?: string; createdAt?: string }>(
  firstValue: T,
  secondValue: T
) {
  const firstKey = firstValue.startDate ?? firstValue.updatedAt ?? firstValue.createdAt ?? "";
  const secondKey = secondValue.startDate ?? secondValue.updatedAt ?? secondValue.createdAt ?? "";
  return secondKey.localeCompare(firstKey);
}

export async function getManagedPlatformGames(options: { includeUnpublished?: boolean } = {}) {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  try {
    const records = await fetchDocumentCollection<ManagedPlatformGameRecord>(COLLECTIONS.platformGames, 100);
    const normalized = filterSoftDeleted(records
      .filter((record) => record?.name)
      .map((record) =>
        normalizeManagedPlatformGame({
          ...record,
          name: record.name,
          sections: record.sections,
        })
      ))
      .sort(compareDateDesc);

    return options.includeUnpublished ? normalized : normalized.filter((record) => record.published);
  } catch {
    return [];
  }
}

export async function saveManagedPlatformGame(
  data: Omit<Partial<ManagedPlatformGameRecord>, "sections"> & { name: string; sections?: string[] | string },
  id?: string
) {
  const payload = normalizeManagedPlatformGame({
    ...data,
    id: id ?? data.id,
    name: data.name,
  });

  const docId = id ?? payload.id;
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.platformGames, payload.slug ?? payload.name, docId, payload.name);
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };

  await saveDocument(COLLECTIONS.platformGames, docId, nextPayload as unknown as Record<string, unknown>);
  return { ...nextPayload, id: docId };
}

export async function deleteManagedPlatformGame(id: string) {
  await softDeleteDocumentEntity(COLLECTIONS.platformGames, id);
  return { id, deleted: true };
}

export async function getManagedPlatformEvents(options: { includeUnpublished?: boolean } = {}) {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  try {
    const records = await fetchDocumentCollection<ManagedPlatformEventRecord>(COLLECTIONS.platformEvents, 200);
    const normalized = filterSoftDeleted(records
      .filter((record) => record?.name)
      .map((record) =>
        normalizeManagedPlatformEvent({
          ...record,
          name: record.name,
          tabs: record.tabs,
        })
      ))
      .sort(compareDateDesc);

    return options.includeUnpublished ? normalized : normalized.filter((record) => record.published);
  } catch {
    return [];
  }
}

export async function getManagedPlatformEventById(id: string) {
  if (!isDocumentStoreConfigured()) {
    return null;
  }

  try {
    const record = await getDocumentByIdOrSlug<ManagedPlatformEventRecord & { id: string }>(COLLECTIONS.platformEvents, id);
    if (!record?.name) {
      return null;
    }

    return normalizeManagedPlatformEvent({
      ...record,
      name: record.name,
      tabs: record.tabs,
    });
  } catch {
    return null;
  }
}

export async function saveManagedPlatformEvent(
  data: Omit<Partial<ManagedPlatformEventRecord>, "tabs"> & { name: string; tabs?: string[] | string },
  id?: string
) {
  const payload = normalizeManagedPlatformEvent({
    ...data,
    id: id ?? data.id,
    name: data.name,
  });
  const docId = id ?? payload.id;
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.platformEvents, payload.slug ?? payload.name, docId, payload.name);
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };

  await saveDocument(COLLECTIONS.platformEvents, docId, nextPayload as unknown as Record<string, unknown>);
  return { ...nextPayload, id: docId };
}

export async function deleteManagedPlatformEvent(id: string) {
  await softDeleteDocumentEntity(COLLECTIONS.platformEvents, id);
  return { id, deleted: true };
}
