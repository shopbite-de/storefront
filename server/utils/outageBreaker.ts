import { AsyncLocalStorage } from "node:async_hooks";

/*
 * The Store API outage breaker (ADR 0001, step 6 review): when Shopware
 * stops answering, a rendered page waits for about one deadline instead of
 * one per read. It opens only after two requests without an answer
 * (deadline, no connection) within `WINDOW_MS`, with no answer between,
 * and then fails requests at once with 503 for `OUTAGE_OPEN_MS`, letting
 * one probe through `OUTAGE_PROBE_MS` after the last one ended; the first
 * answer (also a refusal or a 5xx) closes it. Other errors (an unreadable answer,
 * a programming error) never count. The order placement and its follow-up
 * look-ups run in `bypassOutageBreaker`: a slow order never takes the shop
 * down, and a look-up for an order that may have landed always asks.
 */
export const OUTAGE_WINDOW_MS = 15_000;
export const OUTAGE_OPEN_MS = 30_000;
/**
 * While open, one request asks Shopware (a probe) this many ms after the
 * last probe ended, never two at once: a page in an outage pays at most
 * one deadline, and the shop is back soon after Shopware.
 */
export const OUTAGE_PROBE_MS = 10_000;

let failures: number[] = [];
let openUntil = 0;
let lastProbe = 0;
let probing = false;
const bypass = new AsyncLocalStorage<boolean>();

/** Runs `task` with requests that neither wait for nor open the breaker. */
export function bypassOutageBreaker<T>(task: () => Promise<T>): Promise<T> {
  return bypass.run(true, task);
}

export const isOutageBreakerBypassed = (): boolean =>
  bypass.getStore() === true;

const NO_ANSWER_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);

type Failure = {
  name?: string;
  code?: string;
  statusCode?: number;
  status?: number;
  response?: { status?: number };
  cause?: unknown;
} | null;

const statusOf = (error: Failure) =>
  error?.statusCode ?? error?.status ?? error?.response?.status;

/** A deadline or a connection that failed: Shopware gave no answer. */
export function isMissingAnswer(error: unknown): boolean {
  if (statusOf(error as Failure) !== undefined) return false;
  for (let value = error as Failure, depth = 0; value && depth < 5; depth++) {
    if (value.name === "TimeoutError" || value.name === "AbortError")
      return true;
    if (value.code && NO_ANSWER_CODES.has(value.code)) return true;
    value = (value.cause ?? null) as Failure;
  }
  return false;
}

/** A Store API request behind the breaker. */
export async function guardedRequest<T>(request: () => Promise<T>): Promise<T> {
  const bypassed = isOutageBreakerBypassed();
  const now = Date.now();
  const open = now < openUntil;
  // while open, one request every few seconds is let through: its answer
  // closes the breaker as soon as Shopware is back
  const probe =
    !bypassed && open && !probing && now - lastProbe >= OUTAGE_PROBE_MS;
  if (probe) probing = true;
  if (!bypassed && open && !probe) {
    throw Object.assign(new Error("The Store API is down."), {
      name: "StoreApiDown",
      statusCode: 503,
    });
  }
  try {
    const answer = await request();
    if (!bypassed) close();
    return answer;
  } catch (error) {
    if (!bypassed) {
      // a probe without an answer: still down, open for another window
      if (probe && isMissingAnswer(error)) {
        openUntil = Date.now() + OUTAGE_OPEN_MS;
      } else if (isMissingAnswer(error)) noteMissingAnswer();
      else if (statusOf(error as Failure) !== undefined) close();
    }
    throw error;
  } finally {
    if (probe) {
      probing = false;
      lastProbe = Date.now();
    }
  }
}

function close() {
  failures = [];
  openUntil = 0;
}

function noteMissingAnswer() {
  const now = Date.now();
  failures = [...failures.filter((at) => now - at <= OUTAGE_WINDOW_MS), now];
  if (failures.length >= 2) {
    openUntil = now + OUTAGE_OPEN_MS;
    lastProbe = now;
    failures = [];
  }
}
