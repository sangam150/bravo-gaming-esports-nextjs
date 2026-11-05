import type { LoginAccessVariant, LoginErrorStage, LoginFailureCategory } from "./user-facing-errors";
import { notifyAuthSessionChanged } from "./auth-session-events";

type LoginSessionResponse = {
  success?: boolean;
  status?: number;
  redirectTo?: string;
  user?: {
    uid?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
    teamId?: string | null;
    playerId?: string | null;
  };
  error?: string;
};

async function authRequest(url: string, options: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    throw new Error("The sign-in service could not be reached. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function performPasswordLogin(request: {
  email: string;
  password: string;
  variant: LoginAccessVariant;
  redirect?: string | null;
}) {
  const response = await authRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    credentials: "include",
  });
  const data = (await response.json().catch(() => ({}))) as LoginSessionResponse;

  if (response.ok && data.success) notifyAuthSessionChanged();

  return { response, data };
}

export async function createBravoSession(accessToken: string) {
  const response = await authRequest("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
    credentials: "include",
  });
  const data = (await response.json().catch(() => ({}))) as LoginSessionResponse;
  if (!response.ok || !data.success) throw new Error(data.error || "Unable to verify your sign-in session.");

  return { response, data };
}

export async function clearBravoSession() {
  const response = await authRequest("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Sign-out could not be confirmed. Check your connection and try again.");
  notifyAuthSessionChanged();
}

export async function reportLoginFailure(payload: {
  variant: LoginAccessVariant;
  category: LoginFailureCategory;
  stage: LoginErrorStage;
  status?: number | null;
  code?: string | null;
}) {
  await fetch("/api/auth/login-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  }).catch(() => undefined);
}
