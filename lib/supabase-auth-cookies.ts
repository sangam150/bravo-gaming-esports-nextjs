export function isSupabaseAuthCookieName(name: string) {
  const normalizedName = name.trim().toLowerCase();
  return (
    (normalizedName.startsWith("sb-") && normalizedName.includes("-auth-token")) ||
    normalizedName === "supabase-auth-token" ||
    normalizedName.startsWith("supabase-auth-token.")
  );
}

export function isSupabaseSessionCookieName(name: string) {
  const normalizedName = name.trim().toLowerCase();
  return isSupabaseAuthCookieName(normalizedName) && !normalizedName.includes("-code-verifier");
}

export function requestHasSupabaseAuthCookie(request: Pick<Request, "headers">) {
  return (request.headers.get("cookie") ?? "").split(";").some((cookie) => isSupabaseSessionCookieName(cookie.split("=", 1)[0] ?? ""));
}
