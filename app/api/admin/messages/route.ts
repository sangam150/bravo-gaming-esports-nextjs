import { requireAdmin } from "@/lib/admin-auth";
import { getContactMessages, updateContactMessageStatus } from "@/lib/contact-messages";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getContactMessages();
  return Response.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const status = body.status === "reviewed" ? "reviewed" : "new";
    const result = await updateContactMessageStatus(body.id, status);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
