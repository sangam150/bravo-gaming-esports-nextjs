import { requireAdmin } from "@/lib/admin-auth";
import { deleteAnnouncement, getAnnouncements, saveAnnouncement } from "@/lib/data";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { requireSameOrigin } from "@/lib/request-origin";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";

export async function GET() {
  const data = await getAnnouncements();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  try {
    const body = await request.json();
    if (!body.title || !body.detail) {
      return Response.json(
        {
          error: "Please provide both a title and announcement details before saving.",
        },
        { status: 400 },
      );
    }
    await writeRequiredAuditLogFromRequest(request, { action: "announcement.save", entityType: "announcement", entityId: body.id ?? "new", newValue: body });
    const result = await saveAnnouncement(body, body.id);
    revalidateCompetitionPaths();
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "A valid announcement ID is required." }, { status: 400 });
  await writeRequiredAuditLogFromRequest(request, { action: "announcement.delete", entityType: "announcement", entityId: id });
  await deleteAnnouncement(id);
  revalidateCompetitionPaths();
  return Response.json({ success: true, data: { id, deleted: true } });
}
