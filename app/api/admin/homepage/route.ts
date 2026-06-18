import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getHomepageContent, saveHomepageContent } from "@/lib/platform-content";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getHomepageContent();
  return Response.json({ success: true, data });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const result = await saveHomepageContent(body);

    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/events");
    revalidatePath("/games");

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
