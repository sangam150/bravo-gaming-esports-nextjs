import "server-only";

import { createHash } from "crypto";
import { isSupabaseServiceRoleConfigured } from "./supabase/server-env";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

type RateLimitOptions = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type SharedRateLimitPayload = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
  reset_at?: string;
} | null;

declare global {
  var __bravoRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const SESSION_COOKIE_NAME = "bravo_session";

function getRateLimitStore() {
  if (!globalThis.__bravoRateLimitStore) {
    globalThis.__bravoRateLimitStore = new Map<string, RateLimitRecord>();
  }

  return globalThis.__bravoRateLimitStore;
}

function buildTokenFingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function getRequestIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip");

  return forwardedFor?.split(",")[0]?.trim() || "anonymous";
}

function getRequestSessionFingerprint(request: Request) {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.startsWith("Bearer ")) {
    return buildTokenFingerprint(authHeader.slice("Bearer ".length));
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1];
  if (sessionCookie) {
    return buildTokenFingerprint(sessionCookie);
  }

  return null;
}

function buildRateLimitIdentifier(request: Request, key: string) {
  const ip = getRequestIp(request);
  const sessionFingerprint = getRequestSessionFingerprint(request);
  return sessionFingerprint ? `${key}:${ip}:${sessionFingerprint}` : `${key}:${ip}`;
}

function createRateLimitResponse(retryAfterSeconds: number, remaining = 0, resetAt?: string | number) {
  const headers = new Headers({
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Remaining": String(Math.max(remaining, 0)),
  });

  if (typeof resetAt === "number") {
    headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  } else if (typeof resetAt === "string" && resetAt) {
    const resetTimestamp = Date.parse(resetAt);
    if (Number.isFinite(resetTimestamp)) {
      headers.set("X-RateLimit-Reset", String(Math.ceil(resetTimestamp / 1000)));
    }
  }

  return Response.json(
    { error: `Too many requests. Try again in ${retryAfterSeconds} seconds.` },
    {
      status: 429,
      headers,
    }
  );
}

function enforceInMemoryRateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  const store = getRateLimitStore();
  const current = store.get(identifier);

  if (!current || current.resetAt <= now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (current.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return createRateLimitResponse(retryAfterSeconds, 0, current.resetAt);
  }

  current.count += 1;
  store.set(identifier, current);
  return null;
}

async function enforceSharedRateLimit(identifier: string, options: RateLimitOptions) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc(
    "consume_rate_limit" as never,
    {
      p_key: identifier,
      p_max_requests: options.maxRequests,
      p_window_ms: options.windowMs,
    } as never
  );

  if (error) {
    throw error;
  }

  const payload = (data ?? null) as SharedRateLimitPayload;
  if (!payload?.allowed) {
    return createRateLimitResponse(
      Math.max(1, payload?.retry_after_seconds ?? 1),
      Math.max(0, payload?.remaining ?? 0),
      payload?.reset_at
    );
  }

  return null;
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const identifier = buildRateLimitIdentifier(request, options.key);

  if (isSupabaseServiceRoleConfigured()) {
    try {
      return await enforceSharedRateLimit(identifier, options);
    } catch {
      return enforceInMemoryRateLimit(identifier, options);
    }
  }

  return enforceInMemoryRateLimit(identifier, options);
}
