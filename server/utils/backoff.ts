/** How long a failed Shopware request pauses the next ones. */
export const FAILURE_BACKOFF_MS = 30_000;

/** Remembers a failure for `ms`, so an outage is not asked on every request. */
export function createBackoff(
  ms: number = FAILURE_BACKOFF_MS,
  now: () => number = () => Date.now(),
) {
  let until = 0;
  return {
    active: () => now() < until,
    trip: () => {
      until = now() + ms;
    },
  };
}

function statusOf(error: unknown): number | undefined {
  const { statusCode, status } = (error ?? {}) as {
    statusCode?: number;
    status?: number;
  };
  return statusCode ?? status;
}

/** A network error or a 5xx; a 4xx is an answer, not an outage. */
export function isOutage(error: unknown): boolean {
  const status = statusOf(error);
  return status === undefined || status >= 500;
}

/**
 * Shields Shopware from a cache's misses during an outage (one loader per
 * cached handler): the last good answer per key is served when a request
 * fails, and after a failure Shopware is asked again only after the
 * backoff; without a last good answer the request fails fast with 503.
 * `keep` decides which answers are remembered (keeps the memory bounded).
 */
export function createResilientLoader<T>(
  keep: (value: T) => boolean = () => true,
  backoff = createBackoff(),
) {
  const lastGood = new Map<string, T>();
  const unavailable = () =>
    Object.assign(new Error("Shopware unavailable"), { statusCode: 503 });

  return async (key: string, load: () => Promise<T>): Promise<T> => {
    if (backoff.active()) {
      if (lastGood.has(key)) return lastGood.get(key)!;
      throw unavailable();
    }
    try {
      const value = await load();
      if (keep(value)) lastGood.set(key, value);
      return value;
    } catch (error) {
      if (!isOutage(error)) throw error;
      backoff.trip();
      if (lastGood.has(key)) return lastGood.get(key)!;
      throw Object.assign(unavailable(), { cause: error });
    }
  };
}
