const TECHNICAL_MESSAGE_PATTERN =
  /supabase|firebase|postgres|database|relation|column|schema|query|pgrst|row-level|rls|jwt|token|failed to fetch|networkerror|typeerror|syntaxerror|stack|env|api key|not configured|unexpected|internal server|status \d{3}|request failed|permission denied|unauthorized|forbidden/i;

export const USER_FACING_ERROR_MESSAGES = {
  network: "We're having trouble connecting to our servers. Please refresh the page or try again shortly.",
  server: "Something went wrong on our end. Please try again shortly while we work on a fix.",
  permission: "You do not have permission to access this page.",
  notFound: "The page you are looking for does not exist or may have been moved.",
  session: "Your session could not be verified. Please sign in again.",
  badRequest: "We couldn't process that request. Please review your information and try again.",
  login: "We couldn't sign you in with those details. Please review your email and password and try again.",
  contact: "We couldn't send your message right now. Please try again shortly.",
  registration: "We couldn't submit your registration right now. Please review your details and try again.",
  admin: "We couldn't complete that action right now. Please try again shortly.",
  teamWorkspace: "We couldn't load the team workspace right now. Please refresh the page or try again shortly.",
} as const;

export const USER_FACING_LABELS = {
  teamPendingConfirmation: "Team pending confirmation",
  playerPendingConfirmation: "Player pending confirmation",
  teamPendingMapping: "Team pending mapping",
  playerPendingMapping: "Player pending mapping",
} as const;

export function getUserFacingTeamLabel(
  value?: string | null,
  fallback: string = USER_FACING_LABELS.teamPendingConfirmation
) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

export function getUserFacingPlayerLabel(
  value?: string | null,
  fallback: string = USER_FACING_LABELS.playerPendingConfirmation
) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function getRawErrorMessage(error: unknown) {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message.trim();
  }
  return "";
}

function isSafePublicMessage(message: string) {
  if (!message) return false;
  if (message.length > 220) return false;
  if (TECHNICAL_MESSAGE_PATTERN.test(message)) return false;
  if (/\bundefined\b|null/i.test(message)) return false;
  return true;
}

function getStatusFallback(status?: number, fallback?: string) {
  if (fallback) return fallback;
  if (status === 401) return USER_FACING_ERROR_MESSAGES.session;
  if (status === 403) return USER_FACING_ERROR_MESSAGES.permission;
  if (status === 404) return USER_FACING_ERROR_MESSAGES.notFound;
  if (typeof status === "number" && status >= 500) return USER_FACING_ERROR_MESSAGES.server;
  return USER_FACING_ERROR_MESSAGES.badRequest;
}

export function toUserFacingErrorMessage(
  error: unknown,
  options: {
    status?: number;
    fallback?: string;
  } = {}
) {
  const rawMessage = getRawErrorMessage(error);

  if (/failed to fetch|network request failed|load failed|networkerror/i.test(rawMessage)) {
    return USER_FACING_ERROR_MESSAGES.network;
  }

  if (options.status === 401) return USER_FACING_ERROR_MESSAGES.session;
  if (options.status === 403) return USER_FACING_ERROR_MESSAGES.permission;
  if (options.status === 404) return USER_FACING_ERROR_MESSAGES.notFound;
  if (typeof options.status === "number" && options.status >= 500) {
    return options.fallback ?? USER_FACING_ERROR_MESSAGES.server;
  }

  if (isSafePublicMessage(rawMessage)) {
    return rawMessage;
  }

  return getStatusFallback(options.status, options.fallback);
}

export function getResponseErrorMessage(
  response: Response,
  error: unknown,
  options: {
    fallback?: string;
  } = {}
) {
  return toUserFacingErrorMessage(error, {
    status: response.status,
    fallback: options.fallback,
  });
}

export function jsonErrorResponse(
  error: unknown,
  options: {
    status?: number;
    fallback?: string;
  } = {}
) {
  const status = options.status ?? 500;
  return Response.json(
    {
      error: toUserFacingErrorMessage(error, {
        status,
        fallback: options.fallback,
      }),
    },
    { status }
  );
}
