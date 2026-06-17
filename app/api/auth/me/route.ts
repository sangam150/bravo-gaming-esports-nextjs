import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await getServerAuthenticatedSession();
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({
    authenticated: true,
    user: {
      profileId: session.profileId,
      uid: session.uid,
      email: session.email,
      role: session.role,
      teamId: session.teamId,
      displayName: session.displayName,
      isAdmin: session.isAdmin,
    },
  });
}
