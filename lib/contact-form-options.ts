export const CONTACT_SUBJECT_OPTIONS = {
  contact: ["Tournament support", "Scrim participation", "Sponsorship", "Community concern", "General inquiry"],
  feedback: ["Match result review", "Event idea", "Broadcast quality", "Website experience", "Other feedback"],
} as const;

export type ContactMessageKind = keyof typeof CONTACT_SUBJECT_OPTIONS;

export function isContactMessageKind(value: unknown): value is ContactMessageKind {
  return value === "contact" || value === "feedback";
}

export function isContactSubject(kind: ContactMessageKind, subject: string) {
  return CONTACT_SUBJECT_OPTIONS[kind].some((option) => option === subject);
}
