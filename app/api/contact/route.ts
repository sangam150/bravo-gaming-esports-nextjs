import { createContactMessage } from "@/lib/contact-messages";
import { isContactMessageKind, isContactSubject } from "@/lib/contact-form-options";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function badRequest(error: string) {
  return Response.json({ error }, { status: 400, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "public-contact",
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const payload: unknown = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return badRequest("Please submit a valid contact form.");
    }

    const body = payload as Record<string, unknown>;
    if (!isContactMessageKind(body.kind)) {
      return badRequest("Please choose a valid message type.");
    }

    const kind = body.kind;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !subject || !message) {
      return badRequest("Please provide your name, email address, subject, and message before submitting.");
    }

    if (name.length > 120 || email.length > 254 || subject.length > 120 || message.length > 5000) {
      return badRequest("One or more fields are longer than allowed.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      return badRequest("Please provide a valid email address.");
    }

    if (!isContactSubject(kind, subject)) {
      return badRequest("Please choose a valid subject.");
    }

    await createContactMessage({
      kind,
      name,
      email,
      subject,
      message,
    });

    return Response.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    await logServerError("contact.create", error, request);
    const response = jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.contact,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
