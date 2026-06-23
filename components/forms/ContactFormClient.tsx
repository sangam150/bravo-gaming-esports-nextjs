"use client";

import { useState } from "react";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

type ContactFormClientProps = {
  kind: "contact" | "feedback";
  title: string;
  description: string;
  submitLabel: string;
  subjectLabel?: string;
};

const inputClass =
  "w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-bravoBlue";

export default function ContactFormClient({
  kind,
  title,
  description,
  submitLabel,
  subjectLabel = "Subject",
}: ContactFormClientProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name,
          email,
          subject,
          message,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, data.error, {
            fallback: USER_FACING_ERROR_MESSAGES.contact,
          })
        );
      }

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setNotice(
        kind === "feedback"
          ? "Feedback received. Thank you for helping improve Bravo."
          : "Message received. The Bravo team will get back to you soon."
      );
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.contact,
        })
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
      <div>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-green-200">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your Name" required />
      <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email Address" required />
      <input className={inputClass} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={subjectLabel} />
      <textarea className={inputClass} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message" required />
      <button type="submit" disabled={submitting} className="w-full rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-60">
        {submitting ? "Sending your message..." : submitLabel}
      </button>
    </form>
  );
}
