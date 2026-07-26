export type RequestedDataBackend = "auto" | "supabase";

function normalizeRequestedDataBackend(value?: string | null): RequestedDataBackend {
  const normalizedValue = value?.trim().toLowerCase();
  if (normalizedValue === "supabase") {
    return "supabase";
  }

  return "auto";
}

export function getRequestedServerDataBackend() {
  return normalizeRequestedDataBackend(process.env.BRAVO_DATA_BACKEND ?? process.env.NEXT_PUBLIC_BRAVO_DATA_BACKEND);
}
