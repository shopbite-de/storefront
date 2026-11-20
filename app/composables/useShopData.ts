/**
 * Restaurant operations through the storefront's own routes (ADR 0001,
 * step 1): the server renders from their caches, the browser asks for the
 * live value (`?fresh=1`), retried like the opening hours (#355). On the
 * server a retry would delay the page, so only ofetch's single retry of a
 * GET applies there.
 */
export async function loadShopData<T>(
  path: string,
  fresh: boolean,
  retryDelays: readonly number[] = OPENING_HOURS_RETRY_DELAYS,
): Promise<T> {
  // the routes answer domain types; Nitro's route typing does not know them
  if (!fresh) return (await $fetch(path)) as T;
  // the retries are ours (withRetries), not ofetch's
  return await withRetries(
    () => $fetch(path, { query: { fresh: "1" }, retry: 0 }) as Promise<T>,
    retryDelays,
  );
}
