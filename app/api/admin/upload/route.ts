import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, createFirestoreDocument } from "@/lib/firebase";
import { buildStoragePath, uploadToStorage } from "@/lib/firebase-storage";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;
    const entityId = (formData.get("entityId") as string) || "general";

    if (!file || !type) {
      return Response.json({ error: "file and type are required" }, { status: 400 });
    }

    const allowed = ["team_logo", "player_avatar", "tournament_banner", "match_screenshot"];
    if (!allowed.includes(type)) {
      return Response.json({ error: "Invalid upload type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = buildStoragePath(
      type as "team_logo" | "player_avatar" | "tournament_banner" | "match_screenshot",
      entityId,
      file.name
    );
    const url = await uploadToStorage(buffer, path, file.type || "application/octet-stream");

    const record = await createFirestoreDocument(COLLECTIONS.uploads, {
      path,
      url,
      type,
      entityId,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    });

    return Response.json({ success: true, url, id: record.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
