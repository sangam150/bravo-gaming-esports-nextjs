import { randomUUID } from "crypto";
import {
  COLLECTIONS,
  fetchDocumentCollection,
  getDocument,
  isDocumentStoreConfigured,
  saveDocument,
} from "./document-store";
import type { ContactMessage } from "./types";

function cleanString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeContactMessage(
  data: Partial<ContactMessage> & { kind: ContactMessage["kind"]; name: string; email: string; message: string }
): ContactMessage {
  const now = new Date().toISOString();

  return {
    id: cleanString(data.id) ?? randomUUID(),
    kind: data.kind,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    subject: cleanString(data.subject),
    message: data.message.trim(),
    status: data.status === "reviewed" ? "reviewed" : "new",
    createdAt: cleanString(data.createdAt) ?? now,
    updatedAt: now,
  };
}

function compareCreatedAtDesc(firstValue: ContactMessage, secondValue: ContactMessage) {
  return (secondValue.createdAt ?? "").localeCompare(firstValue.createdAt ?? "");
}

export async function createContactMessage(
  data: Pick<ContactMessage, "kind" | "name" | "email" | "message"> & Partial<Pick<ContactMessage, "subject">>
) {
  const payload = normalizeContactMessage(data);
  await saveDocument(COLLECTIONS.contactMessages, payload.id, payload as unknown as Record<string, unknown>);
  return payload;
}

export async function getContactMessages() {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  try {
    const messages = await fetchDocumentCollection<ContactMessage>(COLLECTIONS.contactMessages, 200);
    return messages.sort(compareCreatedAtDesc);
  } catch {
    return [];
  }
}

export async function updateContactMessageStatus(id: string, status: ContactMessage["status"]) {
  const existing = await getDocument<ContactMessage>(COLLECTIONS.contactMessages, id);
  if (!existing) {
    throw new Error("Message not found");
  }

  const payload = normalizeContactMessage({
    ...existing,
    id,
    status,
    kind: existing.kind,
    name: existing.name,
    email: existing.email,
    message: existing.message,
  });

  await saveDocument(COLLECTIONS.contactMessages, id, payload as unknown as Record<string, unknown>);
  return payload;
}
