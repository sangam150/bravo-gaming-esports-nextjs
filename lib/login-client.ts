import type { LoginAccessVariant, LoginErrorStage, LoginFailureCategory } from "./user-facing-errors";

type LoginSessionResponse = {
  success?: boolean;
  status?: number;
  accessToken?: string;
  refreshToken?: string;
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

export async function performPasswordLogin(request: { email: string; password: string; variant: LoginAccessVariant }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    credentials: "include",
  });
  const data = (await response.json().catch(() => ({}))) as LoginSessionResponse;

  return { response, data };
}

export async function createBravoSession(accessToken: string, refreshToken?: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken }),
    credentials: "include",
  });
  const data = (await response.json().catch(() => ({}))) as LoginSessionResponse;

  return { response, data };
}

export async function clearBravoSession() {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
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
