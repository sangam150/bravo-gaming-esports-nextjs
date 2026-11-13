import { AuthBackendConfigurationError } from "./auth-errors";
import {
  getLoginFailureDetails,
  LOGIN_ERROR_MESSAGES,
  type LoginAccessVariant,
  type LoginFailureDetails,
} from "./user-facing-errors";

const CONNECTION_CODES = new Set([
  "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH",
  "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

function recordsFromCauseChain(error: unknown) {
  const records: Record<string, unknown>[] = [];
  let current = error;
  while (typeof current === "object" && current !== null && records.length < 6 && !records.includes(current as Record<string, unknown>)) {
    const record = current as Record<string, unknown>;
    records.push(record);
    current = record.cause;
  }
  return records;
}

/** A server-only response policy; raw dependency errors are never public text. */
export function getLoginFailureResponse(error: unknown, options: { variant: LoginAccessVariant; credentials?: boolean }) {
  const records = recordsFromCauseChain(error);
  const source = records[0];
  const status = typeof source?.status === "number" && Number.isFinite(source.status) ? source.status : null;
  const rawCode = typeof source?.code === "string" ? source.code : null;
  const code = rawCode && /^[a-zA-Z0-9_-]{1,80}$/.test(rawCode) ? rawCode : null;
  if (status === 429) {
    return {
      status: 429,
      details: { message: LOGIN_ERROR_MESSAGES.rateLimited, category: "rate_limited", status, code } satisfies LoginFailureDetails,
    };
  }
  const unavailable = error instanceof AuthBackendConfigurationError || records.some((record) => {
    const name = typeof record.name === "string" ? record.name : "";
    const message = typeof record.message === "string" ? record.message : "";
    const dependencyCode = typeof record.code === "string" ? record.code : "";
    return CONNECTION_CODES.has(dependencyCode) || /^(UND_ERR_|ERR_TLS_)/.test(dependencyCode) ||
      /^(AuthRetryableFetchError|AbortError|TimeoutError)$/.test(name) ||
      /^(?:TypeError:\s*)?(fetch failed|failed to fetch|network request failed|load failed)$/i.test(message) ||
      /invalid api key|invalid apikey|no api key found/i.test(message);
  }) || (options.credentials === true && typeof status === "number" && status >= 500);

  if (unavailable) {
    return {
      status: 503,
      details: { message: LOGIN_ERROR_MESSAGES.backendUnavailable, category: "backend_unavailable", status, code } satisfies LoginFailureDetails,
    };
  }

  if (options.credentials) {
    const details = getLoginFailureDetails(error, { variant: options.variant, stage: "credentials" });
    if (details.category === "rate_limited") return { status: 429, details };
    if (status === 400 || status === 401 || details.category === "email_unconfirmed") return { status: 401, details };
  }

  return {
    status: 500,
    details: { message: LOGIN_ERROR_MESSAGES.serverError, category: "server_error", status, code } satisfies LoginFailureDetails,
  };
}
