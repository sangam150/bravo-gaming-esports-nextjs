const TECHNICAL_MESSAGE_PATTERN =
  /supabase|firebase|postgres|database|relation|column|schema|query|pgrst|row-level|rls|jwt|token|failed to fetch|networkerror|typeerror|syntaxerror|stack|env|api key|not configured|unexpected|internal server|status \d{3}|request failed|permission denied|unauthorized|forbidden/i;

const LOGIN_INVALID_CREDENTIALS_PATTERN =
  /invalid login credentials|invalid email or password|email or password is invalid|invalid credentials|invalid grant|user not found/i;
const LOGIN_EMAIL_UNCONFIRMED_PATTERN = /email not confirmed|email.*unconfirmed|confirm.*email/i;
const LOGIN_RATE_LIMIT_PATTERN =
  /rate limit|too many requests|too many attempts|retry after|over.*rate|429/i;
const LOGIN_BACKEND_UNAVAILABLE_PATTERN =
  /failed to fetch|network request failed|load failed|networkerror|service unavailable|temporarily unavailable|dns|timeout|not configured|connection|fetch failed|supabase/i;

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
  playerProfile: "We couldn't update your player profile right now. Please try again shortly.",
  teamWorkspace: "We couldn't load the team workspace right now. Please refresh the page or try again shortly.",
} as const;

export const LOGIN_ERROR_MESSAGES = {
  missingCredentials: "Please enter your email and password.",
  invalidCredentials: "Invalid email or password. Please check your details and try again.",
  backendUnavailable: "Login service is temporarily unavailable. Please try again later or contact Bravo support.",
  rateLimited: "Too many login attempts. Please wait a moment and try again.",
  adminRoleMismatch: "This account does not have admin access.",
  teamRoleMismatch: "This account does not have team access.",
  emailUnconfirmed: "Your email address has not been confirmed. Please verify your email before signing in.",
  profileMissing: "Your account has not been fully configured. Please contact the Bravo owner.",
  roleMissing: "Your account access has not been configured. Please contact the Bravo owner.",
  inactiveAccount: "This account is currently inactive. Please contact the Bravo owner.",
  teamMembershipMissing: "This account is not linked to an active team workspace.",
} as const;

export type LoginAccessVariant = "admin" | "team" | "hub";
export type LoginErrorStage = "credentials" | "session" | "role" | "provider";
export type LoginFailureCategory =
  | "missing_credentials"
  | "invalid_credentials"
  | "backend_unavailable"
  | "rate_limited"
  | "role_mismatch"
  | "email_unconfirmed"
  | "profile_missing"
  | "role_missing"
  | "account_inactive"
  | "team_membership_missing";

export type LoginFailureDetails = {
  message: string;
  category: LoginFailureCategory;
  status: number | null;
  code: string | null;
};

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

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" && Number.isFinite(status) ? status : null;
  }

  return null;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error) {
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : "error_code" in error && typeof error.error_code === "string"
          ? error.error_code
          : null;
    return code?.trim() || null;
  }

  return null;
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

export function getRoleAccessErrorMessage(variant: Exclude<LoginAccessVariant, "hub">) {
  return variant === "admin" ? LOGIN_ERROR_MESSAGES.adminRoleMismatch : LOGIN_ERROR_MESSAGES.teamRoleMismatch;
}

export function validateLoginCredentials(email: string, password: string) {
  if (!email.trim() || password.length === 0) {
    return LOGIN_ERROR_MESSAGES.missingCredentials;
  }

  return null;
}

export function createRoleAccessError(variant: Exclude<LoginAccessVariant, "hub">) {
  return new Error(getRoleAccessErrorMessage(variant));
}

export function getLoginFailureDetails(
  error: unknown,
  options: {
    variant: LoginAccessVariant;
    stage?: LoginErrorStage;
  }
): LoginFailureDetails {
  const rawMessage = getRawErrorMessage(error);
  const normalizedMessage = rawMessage.toLowerCase();
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const roleMessage = options.variant === "hub" ? null : getRoleAccessErrorMessage(options.variant);

  if (roleMessage && rawMessage === roleMessage) {
    return {
      message: roleMessage,
      category: "role_mismatch",
      status,
      code,
    };
  }

  const controlledMessages = [
    [LOGIN_ERROR_MESSAGES.profileMissing, "profile_missing"],
    [LOGIN_ERROR_MESSAGES.roleMissing, "role_missing"],
    [LOGIN_ERROR_MESSAGES.inactiveAccount, "account_inactive"],
    [LOGIN_ERROR_MESSAGES.teamMembershipMissing, "team_membership_missing"],
  ] as const;
  const controlledMatch = controlledMessages.find(([message]) => rawMessage === message);
  if (controlledMatch) {
    return { message: controlledMatch[0], category: controlledMatch[1], status, code };
  }

  if (LOGIN_EMAIL_UNCONFIRMED_PATTERN.test(normalizedMessage)) {
    return {
      message: LOGIN_ERROR_MESSAGES.emailUnconfirmed,
      category: "email_unconfirmed",
      status,
      code,
    };
  }

  if (status === 429 || LOGIN_RATE_LIMIT_PATTERN.test(normalizedMessage) || code === "over_request_rate_limit") {
    return {
      message: LOGIN_ERROR_MESSAGES.rateLimited,
      category: "rate_limited",
      status,
      code,
    };
  }

  if (
    LOGIN_INVALID_CREDENTIALS_PATTERN.test(normalizedMessage) ||
    (options.stage !== "session" && (status === 400 || status === 401))
  ) {
    return {
      message: LOGIN_ERROR_MESSAGES.invalidCredentials,
      category: "invalid_credentials",
      status,
      code,
    };
  }

  if (
    options.stage === "session" ||
    (typeof status === "number" && status >= 500) ||
    LOGIN_BACKEND_UNAVAILABLE_PATTERN.test(normalizedMessage)
  ) {
    return {
      message: LOGIN_ERROR_MESSAGES.backendUnavailable,
      category: "backend_unavailable",
      status,
      code,
    };
  }

  return {
    message: LOGIN_ERROR_MESSAGES.invalidCredentials,
    category: "invalid_credentials",
    status,
    code,
  };
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
