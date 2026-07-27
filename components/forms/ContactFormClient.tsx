"use client";

import { CONTACT_SUBJECT_OPTIONS, type ContactMessageKind } from "@/lib/contact-form-options";
import { getResponseErrorMessage, toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import Link from "next/link";
import { useState } from "react";

type ContactFormClientProps = {
  kind: ContactMessageKind;
  title: string;
  description: string;
  submitLabel: string;
  subjectLabel?: string;
};

const inputClass =
  "w-full rounded-[16px] border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted focus:border-bravoBlue focus:ring-1 focus:ring-bravoBlue/30";

export default function ContactFormClient({ kind, title, description, submitLabel, subjectLabel = "Subject" }: ContactFormClientProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fieldIdPrefix = `${kind}-message`;

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

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, data.error, {
            fallback: USER_FACING_ERROR_MESSAGES.contact,
          }),
        );
      }

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setNotice(
        kind === "feedback"
          ? "Feedback received. Thank you for helping improve Bravo."
          : "Message received. The Bravo team will get back to you soon.",
      );
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.contact,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className="space-y-4 rounded-[24px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(16,24,43,0.95),rgba(10,16,32,0.95))] p-6 shadow-[0_0_30px_rgba(20,126,245,0.08)]"
    >
      <div>
        <p className="font-display text-lg font-black uppercase text-white">{title}</p>
        <p className="mt-2 text-sm leading-7 text-text-muted">{description}</p>
      </div>

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[16px] border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-green-100"
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[16px] border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor={`${fieldIdPrefix}-name`} className="text-sm font-semibold text-white">
          Your name
        </label>
        <input
          id={`${fieldIdPrefix}-name`}
          name="name"
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
          maxLength={120}
          required
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${fieldIdPrefix}-email`} className="text-sm font-semibold text-white">
          Email address
        </label>
        <input
          id={`${fieldIdPrefix}-email`}
          name="email"
          className={inputClass}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${fieldIdPrefix}-subject`} className="text-sm font-semibold text-white">
          {subjectLabel}
        </label>
        <select
          id={`${fieldIdPrefix}-subject`}
          name="subject"
          className={inputClass}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        >
          <option value="" disabled>
            Select {subjectLabel.toLowerCase()}
          </option>
          {CONTACT_SUBJECT_OPTIONS[kind].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${fieldIdPrefix}-body`} className="text-sm font-semibold text-white">
          Message
        </label>
        <textarea
          id={`${fieldIdPrefix}-body`}
          name="message"
          className={inputClass}
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message"
          maxLength={5000}
          required
        />
      </div>
      <p className="text-xs leading-5 text-text-muted">
        Your details are used only to respond to this message. Read the{" "}
        <Link href="/privacy" className="font-semibold text-accent-blue-light hover:text-white hover:underline">
          privacy policy
        </Link>
        .
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-[16px] bg-[linear-gradient(180deg,#2F98FF,#147EF5)] px-5 py-3 font-display text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? "Sending your message..." : submitLabel}
      </button>
    </form>
  );
}
