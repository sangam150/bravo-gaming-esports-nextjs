import { getServerAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await getServerAdminSession();
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({
    authenticated: true,
    user: { uid: session.uid, email: session.email },
  });
}
