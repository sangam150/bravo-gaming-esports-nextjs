import "server-only";

export const DEFAULT_PUBG_SHARD = process.env.PUBG_SHARD?.trim() || "steam";

export async function fetchPubgMatch(matchId: string, shard = DEFAULT_PUBG_SHARD) {
  const apiKey = process.env.PUBG_API_KEY;

  if (!apiKey) {
    throw new Error("PUBG_API_KEY is missing");
  }

  const response = await fetch(`https://api.pubg.com/shards/${shard}/matches/${matchId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PUBG API failed: ${response.status}`);
  }

  return response.json();
}
