const SUPABASE_REQUEST_TIMEOUT_MS = 10_000;

// Node 22 links composed signals to their sources weakly. Retain the deadline
// while fetch retains the composed request signal, including body consumption.
// Weak keys release it when the request signal can be collected.
const requestDeadlines = new WeakMap<AbortSignal, AbortSignal>();

/** Bound each server HTTP request, including its body, without replacing caller cancellation. */
export function createSupabaseRequestFetch(timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS): typeof fetch {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("Supabase request timeout must be a positive integer.");
  }

  return (input, init) => {
    const requestSignal = input instanceof Request ? input.signal : undefined;
    // RequestInit.signal overrides a Request's signal, including explicit null.
    const callerSignal = init?.signal === null ? undefined : init?.signal ?? requestSignal;
    const deadline = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline;
    if (callerSignal) requestDeadlines.set(signal, deadline);
    // Keep native TLS verification and every other request option unchanged.
    // Resolve global fetch at call time so offline QA can prohibit real networking.
    return globalThis.fetch(input, { ...init, signal });
  };
}

export const supabaseRequestFetch = createSupabaseRequestFetch();
