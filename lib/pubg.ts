const PUBG_BASE = "https://api.pubg.com";
export const PUBG_SHARD = process.env.PUBG_SHARD || "steam";

function getApiKey() {
  const key = process.env.PUBG_API_KEY;
  if (!key) throw new Error("Missing PUBG_API_KEY in .env.local");
  return key;
}

export async function pubgFetch(path: string, needsAuth = true) {
  const headers: Record<string, string> = { Accept: "application/vnd.api+json" };
  if (needsAuth) headers.Authorization = `Bearer ${getApiKey()}`;
  const res = await fetch(`${PUBG_BASE}${path}`, { headers, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`PUBG API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function placementPoints(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 4;
  if (placement >= 4 && placement <= 8) return 2;
  return 0;
}

export function totalPoints(placement: number, kills: number) {
  return placementPoints(placement) + kills;
}

export function extractTelemetryUrl(matchData: any): string | null {
  const asset = matchData?.included?.find((item: any) => item.type === "asset");
  return asset?.attributes?.URL || null;
}

export function summarizeMatch(matchData: any) {
  const attrs = matchData?.data?.attributes || {};
  return {
    id: matchData?.data?.id,
    mapName: attrs.mapName,
    gameMode: attrs.gameMode,
    createdAt: attrs.createdAt,
    duration: attrs.duration,
    telemetryUrl: extractTelemetryUrl(matchData)
  };
}
