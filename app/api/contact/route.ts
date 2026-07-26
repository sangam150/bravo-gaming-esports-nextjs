import { createContactMessage } from "@/lib/contact-messages";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "public-contact",
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const kind = body.kind === "feedback" ? "feedback" : "contact";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return Response.json(
        {
          error: "Please provide your name, email address, and message before submitting.",
        },
        { status: 400 },
      );
    }

    const result = await createContactMessage({
      kind,
      name,
      email,
      subject,
      message,
    });

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("contact.create", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.contact,
    });
  }
}
