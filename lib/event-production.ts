import { resolvePublicAssetUrl } from "./public-asset-url";
export type ProductionStage = {
  id: string;
  name: string;
  order: number;
  archived: boolean;
  pointSystemId: string;
  advanceCount: number;
  completed?: boolean;
};
export type ProductionGroup = { id: string; stageId: string; name: string; teamIds: string[]; order: number; archived: boolean };
export type ProductionDay = { id: string; stageId: string; name: string; date: string; order: number; archived: boolean };
export type ProductionMap = {
  id: string;
  name: string;
  label: string;
  artwork: string;
  thumbnail: string;
  background: string;
  annotations: string;
  order: number;
  archived: boolean;
};
export type SponsorAssignment = {
  id: string;
  stageId: string;
  dayId: string;
  matchId: string;
  graphics: string[];
  position: string;
  order: number;
  rotationSeconds: number;
  startAt: string;
  endAt: string;
  visible: boolean;
};
export type EventProduction = {
  shortName: string;
  eventLogo: string;
  organizerName: string;
  organizerLogo: string;
  hostCountry: string;
  region: string;
  edition: string;
  currency: string;
  timeZone: string;
  officialLinks: string[];
  announcementIds: string[];
  stages: ProductionStage[];
  groups: ProductionGroup[];
  days: ProductionDay[];
  maps: ProductionMap[];
  sponsors: SponsorAssignment[];
  assets: { id: string; name: string; kind: string; url: string; archived: boolean }[];
};
export const DEFAULT_EVENT_PRODUCTION: EventProduction = {
  shortName: "",
  eventLogo: "",
  organizerName: "",
  organizerLogo: "",
  hostCountry: "",
  region: "",
  edition: "",
  currency: "NPR",
  timeZone: "Asia/Kathmandu",
  officialLinks: [],
  announcementIds: [],
  stages: [],
  groups: [],
  days: [],
  maps: [],
  sponsors: [],
  assets: [],
};
export function parseEventProduction(value: unknown): EventProduction {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Event production settings must be an object.");
  const input = value as Record<string, unknown>;
  const text = (row: Record<string, unknown>, key: string, max = 160) => {
    const item = row[key] ?? "";
    if (typeof item !== "string" || item.length > max) throw new Error(`Invalid ${key}.`);
    return item.trim();
  };
  const image = (row: Record<string, unknown>, key: string) => {
    const url = text(row, key, 2000);
    if (url && (!resolvePublicAssetUrl(url) || /\/private\//i.test(url))) throw new Error("Select an approved public image.");
    if (url.includes("://")) {
      const parsed = new URL(url);
      if (parsed.username || parsed.password || (parsed.search && parsed.pathname !== "/api/uploads/r2"))
        throw new Error("Private or signed assets are forbidden.");
    }
    return url;
  };
  const order = (row: Record<string, unknown>, key = "order", max = 10000) => {
    const number = row[key] ?? 0;
    if (!Number.isSafeInteger(number) || Number(number) < 0 || Number(number) > max) throw new Error(`Invalid ${key}.`);
    return Number(number);
  };
  const flag = (row: Record<string, unknown>, key: string, fallback = false) => {
    if (row[key] !== undefined && typeof row[key] !== "boolean") throw new Error(`Invalid ${key}.`);
    return row[key] === undefined ? fallback : row[key] === true;
  };
  const strings = (row: Record<string, unknown>, key: string) => {
    const items = row[key] ?? [];
    if (!Array.isArray(items) || items.length > 200 || items.some((item) => typeof item !== "string" || item.length > 160))
      throw new Error(`Invalid ${key}.`);
    return [...new Set(items)] as string[];
  };
  const list = <T>(key: string, parse: (row: Record<string, unknown>) => T) => {
    const items = input[key] ?? [];
    if (!Array.isArray(items) || items.length > 100) throw new Error(`Limit ${key} to 100 entries.`);
    const ids = new Set<string>();
    return items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Invalid ${key} entry.`);
      const id = text(item, "id", 100);
      if (!id || ids.has(id)) throw new Error(`${key} identities must be unique.`);
      ids.add(id);
      return parse(item);
    });
  };
  const output: EventProduction = {
    ...DEFAULT_EVENT_PRODUCTION,
    shortName: text(input, "shortName"),
    eventLogo: image(input, "eventLogo"),
    organizerName: text(input, "organizerName"),
    organizerLogo: image(input, "organizerLogo"),
    hostCountry: text(input, "hostCountry"),
    region: text(input, "region"),
    edition: text(input, "edition"),
    currency: text(input, "currency", 3) || "NPR",
    timeZone: text(input, "timeZone", 80) || "Asia/Kathmandu",
    officialLinks: strings(input, "officialLinks"),
    announcementIds: strings(input, "announcementIds"),
    stages: list("stages", (row) => ({
      id: text(row, "id", 100),
      name: text(row, "name"),
      order: order(row),
      archived: flag(row, "archived"),
      completed: flag(row, "completed"),
      pointSystemId: text(row, "pointSystemId"),
      advanceCount: order(row, "advanceCount", 1000),
    })),
    groups: list("groups", (row) => ({
      id: text(row, "id", 100),
      stageId: text(row, "stageId", 100),
      name: text(row, "name"),
      teamIds: strings(row, "teamIds"),
      order: order(row),
      archived: flag(row, "archived"),
    })),
    days: list("days", (row) => ({
      id: text(row, "id", 100),
      stageId: text(row, "stageId", 100),
      name: text(row, "name"),
      date: text(row, "date", 10),
      order: order(row),
      archived: flag(row, "archived"),
    })),
    maps: list("maps", (row) => ({
      id: text(row, "id", 100),
      name: text(row, "name", 80),
      label: text(row, "label", 80),
      artwork: image(row, "artwork"),
      thumbnail: image(row, "thumbnail"),
      background: image(row, "background"),
      annotations: image(row, "annotations"),
      order: order(row),
      archived: flag(row, "archived"),
    })),
    sponsors: list("sponsors", (row) => ({
      id: text(row, "id", 100),
      stageId: text(row, "stageId", 100),
      dayId: text(row, "dayId", 100),
      matchId: text(row, "matchId", 160),
      graphics: strings(row, "graphics"),
      position: text(row, "position", 20) || "bottom",
      order: order(row),
      rotationSeconds: order(row, "rotationSeconds", 120) || 10,
      startAt: text(row, "startAt", 80),
      endAt: text(row, "endAt", 80),
      visible: flag(row, "visible", true),
    })),
    assets: list("assets", (row) => ({
      id: text(row, "id", 100),
      name: text(row, "name"),
      kind: text(row, "kind", 40),
      url: image(row, "url"),
      archived: flag(row, "archived"),
    })),
  };
  new Intl.DateTimeFormat("en", { timeZone: output.timeZone });
  if (!/^[A-Z]{3}$/.test(output.currency)) throw new Error("Use a three-letter currency code.");
  const stages = new Set(output.stages.map((stage) => stage.id));
  for (const item of [...output.groups, ...output.days])
    if (!stages.has(item.stageId)) throw new Error("Groups and days must belong to a stage in this event.");
  for (const day of output.days)
    if (
      day.date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
        !Number.isFinite(Date.parse(day.date)) ||
        new Date(day.date).toISOString().slice(0, 10) !== day.date)
    )
      throw new Error("Use a valid match-day date.");
  for (const sponsor of output.sponsors) {
    if (
      (sponsor.stageId && !stages.has(sponsor.stageId)) ||
      (sponsor.dayId && !output.days.some((day) => day.id === sponsor.dayId && (!sponsor.stageId || day.stageId === sponsor.stageId)))
    )
      throw new Error("Sponsor scope must belong to this event.");
    if (!["top", "bottom"].includes(sponsor.position)) throw new Error("Select a supported sponsor position.");
    if (sponsor.startAt && sponsor.endAt && Date.parse(sponsor.startAt) >= Date.parse(sponsor.endAt))
      throw new Error("Sponsor expiry must follow its start.");
  }
  for (const sponsor of output.sponsors)
    for (const key of ["startAt", "endAt"] as const)
      if (sponsor[key] && (!/(Z|[+-]\d{2}:\d{2})$/.test(sponsor[key]) || !Number.isFinite(Date.parse(sponsor[key]))))
        throw new Error("Sponsor dates must have explicit timezones.");
  for (const link of output.officialLinks) {
    const parsed = new URL(link);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Official links must be public HTTPS URLs.");
  }
  return output;
}
