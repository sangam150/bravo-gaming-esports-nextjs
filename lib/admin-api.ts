"use client";

import { getClientAuth } from "./firebase-client";

export async function getIdToken(): Promise<string | null> {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function adminUpload(
  file: File,
  type: "team_logo" | "player_avatar" | "tournament_banner" | "match_screenshot",
  entityId: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  formData.append("entityId", entityId);
  return adminFetch("/api/admin/upload", { method: "POST", body: formData });
}
