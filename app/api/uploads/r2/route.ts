import { getPublicObject, isR2ObjectMissingError, normalizeManagedPublicObjectKey, readObjectBodyAsBuffer } from "@/lib/r2/storage";
import { logServerError } from "@/lib/server-monitoring";
import { toUserFacingErrorMessage } from "@/lib/user-facing-errors";

export const runtime = "nodejs";

const PUBLIC_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizedContentType(value: string | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
}

function notFoundResponse() {
  return Response.json(
    { success: false, code: "public_asset_not_found", error: "Public upload not found." },
    { status: 404, headers: { "Cache-Control": "public, max-age=60" } },
  );
}

/**
 * Public read-only delivery endpoint for versioned managed images.
 *
 * Mutating uploads use their scoped admin, team, or registration routes. The
 * former duplicate POST handler was intentionally removed so authorization
 * and entity activation cannot diverge between two implementations.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectKey = normalizeManagedPublicObjectKey(searchParams.get("key") ?? "");
    if (!objectKey) return notFoundResponse();

    const object = await getPublicObject(objectKey);
    const contentType = normalizedContentType(object.ContentType);
    if (!contentType || !PUBLIC_IMAGE_CONTENT_TYPES.has(contentType)) {
      return Response.json(
        {
          success: false,
          code: "unsupported_public_asset_type",
          error: "This managed public object is not an approved image.",
        },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
    }
    const body = await readObjectBodyAsBuffer(object.Body);
    if (!body) return notFoundResponse();

    const headers = new Headers();
    headers.set("Cache-Control", object.CacheControl ?? "public, max-age=31536000, immutable");
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(body.byteLength));
    if (object.ETag) headers.set("ETag", object.ETag);
    if (object.LastModified) headers.set("Last-Modified", object.LastModified.toUTCString());

    return new Response(new Uint8Array(body), { headers });
  } catch (error: unknown) {
    if (isR2ObjectMissingError(error)) return notFoundResponse();

    await logServerError("uploads.r2.public.get", error, request);
    return Response.json(
      {
        success: false,
        code: "public_asset_delivery_failed",
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't load that public upload right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}
