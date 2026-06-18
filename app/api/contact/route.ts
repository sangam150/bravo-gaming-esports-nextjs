import { createContactMessage } from "@/lib/contact-messages";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kind = body.kind === "feedback" ? "feedback" : "contact";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return Response.json({ error: "name, email, and message are required" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
