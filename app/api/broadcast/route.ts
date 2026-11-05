import { createHash } from "node:crypto";
import { getBroadcastSnapshot } from "@/lib/broadcast-server";
import { logServerError } from "@/lib/server-monitoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cached = await getBroadcastSnapshot();
    // Revalidation can serve stale cache entries while its upstream is down.
    // Bound that window so disconnected OBS sources cannot remain on old data.
    if (Date.now() - cached.generatedAt > 10_000) throw new Error("Broadcast snapshot freshness expired.");
    const data = cached.snapshot;
    const body = JSON.stringify({ success: true, data });
    const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
    const headers = {
      "Cache-Control": "no-cache, must-revalidate",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
      "X-Broadcast-Time": String(Date.now()),
    };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    await logServerError("broadcast.snapshot", error, request);
    return Response.json(
      { error: "Broadcast data is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
}
