import { getRequestSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({
    authenticated: true,
    profileId: session.profileId,
    uid: session.uid,
    email: session.email,
    role: session.role,
    teamId: session.teamId,
    playerId: session.playerId,
    displayName: session.displayName,
    isAdmin: session.isAdmin,
    user: {
      profileId: session.profileId,
      uid: session.uid,
      email: session.email,
      role: session.role,
      teamId: session.teamId,
      playerId: session.playerId,
      displayName: session.displayName,
      isAdmin: session.isAdmin,
    },
  });
}
