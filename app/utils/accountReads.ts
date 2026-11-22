/**
 * Reads of one customer's account data in the browser (step 6 review): a
 * customer switch (login, logout, deletion in the same tab) aborts the
 * reads in flight, and an answer that arrives after a switch is dropped,
 * so the next customer never sees the previous one's addresses, orders
 * or profile. Server-side rendering reads once per request, unguarded
 * (module state would span requests there).
 */
let generation = 0;
let controller: AbortController | null = null;

/** A new customer in this tab: what was asked for the old one is void. */
export function switchAccount(): void {
  if (import.meta.server) return;
  generation++;
  controller?.abort();
  controller = null;
}

/** `read`'s answer, or null when the customer switched while it ran. */
export async function guardedAccountRead<T>(
  read: (signal?: AbortSignal) => Promise<T>,
): Promise<T | null> {
  if (import.meta.server) return read();
  const started = generation;
  controller ??= new AbortController();
  try {
    const answer = await read(controller.signal);
    return started === generation ? answer : null;
  } catch (error) {
    if (started !== generation) return null;
    throw error;
  }
}
