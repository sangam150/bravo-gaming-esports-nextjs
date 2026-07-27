import type { Scrim, ScrimDayResult } from "./types";

export type PublicScrim = Pick<
  Scrim,
  "id" | "title" | "date" | "map" | "lobbyTime" | "teamIds" | "pubgMatchId" | "pubgMatchIds" | "status" | "mapRotation"
>;

export type PublicScrimDayResult = Omit<ScrimDayResult, "scrims"> & {
  scrims: PublicScrim[];
};

export function toPublicScrim(scrim: Scrim): PublicScrim {
  return {
    id: scrim.id,
    title: scrim.title,
    date: scrim.date,
    map: scrim.map,
    lobbyTime: scrim.lobbyTime,
    teamIds: [...scrim.teamIds],
    pubgMatchId: scrim.pubgMatchId,
    pubgMatchIds: scrim.pubgMatchIds ? [...scrim.pubgMatchIds] : undefined,
    status: scrim.status,
    mapRotation: scrim.mapRotation ? [...scrim.mapRotation] : undefined,
  };
}

export function toPublicScrimDayResult(day: ScrimDayResult): PublicScrimDayResult {
  return {
    ...day,
    scrims: day.scrims.map(toPublicScrim),
  };
}
