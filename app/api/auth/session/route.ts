import { SESSION_COOKIE, SESSION_MAX_AGE, verifyAdminToken } from "@/lib/firebase-auth-server";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return Response.json({ error: "idToken is required" }, { status: 400 });
    }
    const decoded = await verifyAdminToken(idToken);
    const response = Response.json({
      success: true,
      user: { uid: decoded.uid, email: decoded.email },
    });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${idToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const response = Response.json({ success: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return response;
}
