/** Deduplicate in-flight checks and retry transient failures after a short TTL. */
export function createReadinessProbe(check: () => Promise<boolean>, now = Date.now) {
  let pending: Promise<boolean> | null = null;
  let expiresAt = 0;
  return () => {
    if (pending && now() < expiresAt) return pending;
    expiresAt = Number.POSITIVE_INFINITY;
    pending = Promise.resolve()
      .then(check)
      .then(
        (ready) => {
          expiresAt = now() + (ready ? 30_000 : 5000);
          return ready;
        },
        (error) => {
          expiresAt = now() + 5000;
          throw error;
        },
      );
    return pending;
  };
}
