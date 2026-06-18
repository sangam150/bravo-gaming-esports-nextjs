import type { Json } from "@/types/database.types";

export type JsonObject = { [key: string]: Json | undefined };

export function sanitizeJsonValue(value: unknown): Json | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value as Json;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonValue(item))
      .filter((item): item is Json => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, sanitizeJsonValue(nestedValue)] as const)
        .filter((entry): entry is [string, Json] => entry[1] !== undefined)
    ) as JsonObject;
  }

  return undefined;
}

export function sanitizeJsonObject(value: Record<string, unknown>): JsonObject {
  return (sanitizeJsonValue(value) as JsonObject | undefined) ?? {};
}

export function readJsonObject(value: Json | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
