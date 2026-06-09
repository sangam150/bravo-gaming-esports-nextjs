type RateLimitOptions = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

declare global {
  var __bravoRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__bravoRateLimitStore) {
    globalThis.__bravoRateLimitStore = new Map<string, RateLimitRecord>();
  }

  return globalThis.__bravoRateLimitStore;
}

function getRequestIdentifier(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip");

  return forwardedFor?.split(",")[0]?.trim() || "anonymous";
}

export function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const identifier = `${options.key}:${getRequestIdentifier(request)}`;
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
    return Response.json(
      { error: `Too many requests. Try again in ${retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }

  current.count += 1;
  store.set(identifier, current);
  return null;
}
