import {
  DomainError,
  isDomainError,
  type Order,
  type PlacedOrder,
  type ServiceSchedule,
  type ShippingMethod,
  type WishedTime,
} from "../../shared/domain";
import {
  restaurantNow,
  shiftDate,
  WISHED_TIME_STEP,
  wishedTimeWindow,
} from "../../app/utils/restaurantTime";
import { shippingLeadTime } from "../../app/utils/leadTime";
import type { Backend, BackendSession } from "../ports";
import type { PlaceOrderInput } from "./checkoutRoutes";

/** What the storefront checks before it asks the backend for an order. */
export type PlacementGates = Readonly<{
  /** The restaurant's switch, as the backend has it now. */
  acceptsOrders: () => Promise<boolean>;
  /** Time zone, opening hours and holidays of the ordering window. */
  schedule: () => Promise<ServiceSchedule>;
  shippingMethods: () => Promise<readonly ShippingMethod[]>;
}>;

const outside = () =>
  new DomainError(
    "outside_ordering_window",
    "The wished time is outside the ordering window.",
  );

/**
 * The wished time lies in the ordering window the checkout offers now
 * (`wishedTimeWindow`: today's spans, from now plus the lead time to the
 * span's end, never on a holiday), on the grid. One grid step of grace
 * before the earliest time: the browser's clock moves on once a minute.
 */
export function checkWishedTime(
  wished: WishedTime,
  now: Date,
  schedule: ServiceSchedule,
  leadMinutes: number | null,
): void {
  const window = wishedTimeWindow(now, schedule, leadMinutes);
  if (window.kind !== "open") throw outside();
  const today = restaurantNow(now, schedule.timeZone).date;
  const offset =
    wished.date === today
      ? 0
      : wished.date === shiftDate(today, 1)
        ? 1440
        : null;
  if (offset === null) throw outside();
  const minutes = offset + wished.time.minutes;
  if (minutes < window.earliest - WISHED_TIME_STEP || minutes > window.latest) {
    throw outside();
  }
}

type Attempt = { at: number; placed?: PlacedOrder };

/** An order request that got no answer: the order may still land. */
type Unanswered = { at: number };

const statusUnknown = () =>
  new DomainError(
    "order_status_unknown",
    "The order got no answer and cannot be found (yet).",
  );

/**
 * Places a visitor's order at most once (ADR 0001, step 5). The browser
 * sends one attempt id per press of the order button and the same id
 * again when it retries (outdated session).
 *
 * - An attempt this process placed already answers its order again
 *   (double click, a retry after the answer was lost on the way).
 * - The adapter sends the order request once and waits long for it
 *   (Shopware: 60 s), since the backend may still commit an order the
 *   storefront stopped waiting for. When the answer does not come, the
 *   attempt and the session are marked unanswered and nothing is ever
 *   placed for them again: this request, a retry and a new press look for
 *   an order the session placed since (polling for a while) and answer it,
 *   or `order_status_unknown` (the guest is told to check the e-mail or
 *   call before ordering again). The mark ends after `unansweredTtlMs`.
 * - A new attempt with an empty cart is `order_already_placed` with the
 *   session's order of the last 15 minutes (another tab, a reload), never
 *   a new success; without one it is `cart_empty`.
 * - A placed order whose payment cannot be started is still answered,
 *   `paymentFailed`, so the guest goes to the payment retry.
 *
 * Runs inside the visitor's exclusive section (one write at a time per
 * process). Attempts and marks are per process: an unanswered order seen
 * by another instance is unknown there (documented limit).
 */
export function createOrderPlacement(
  options: {
    /** The clock of the ordering window (tests). */
    now?: () => Date;
    /** Attempts remembered (oldest first out) and for how long. */
    maxAttempts?: number;
    attemptTtlMs?: number;
    /** How long an unanswered order blocks the session's placements. */
    unansweredTtlMs?: number;
    /** Pauses between the looks for an unanswered order (about 30 s). */
    pollDelaysMs?: readonly number[];
    /** How far the backend's clock may be behind ours. */
    clockSkewMs?: number;
    /** How old an order may be to name it for an empty cart. */
    recentMs?: number;
  } = {},
) {
  const now = options.now ?? (() => new Date());
  const maxAttempts = options.maxAttempts ?? 10_000;
  const ttlMs = options.attemptTtlMs ?? 30 * 60_000;
  const unansweredTtlMs = options.unansweredTtlMs ?? 15 * 60_000;
  const pollDelaysMs = options.pollDelaysMs ?? [
    0, 3000, 5000, 7000, 7000, 8000,
  ];
  const skewMs = options.clockSkewMs ?? 2 * 60_000;
  const recentMs = options.recentMs ?? 15 * 60_000;
  const attempts = new Map<string, Attempt>();
  const unanswered = new Map<string, Unanswered>();

  function bounded<T>(map: Map<string, T>, key: string, value: T) {
    map.delete(key);
    map.set(key, value);
    while (map.size > maxAttempts) map.delete(map.keys().next().value!);
  }

  function known(key: string): Attempt | undefined {
    const attempt = attempts.get(key);
    if (attempt && Date.now() - attempt.at > ttlMs) {
      attempts.delete(key);
      return undefined;
    }
    return attempt;
  }

  function pending(sessionKey: string): Unanswered | undefined {
    const mark = unanswered.get(sessionKey);
    if (mark && Date.now() - mark.at > unansweredTtlMs) {
      unanswered.delete(sessionKey);
      return undefined;
    }
    return mark;
  }

  async function withPayment(
    backend: Backend,
    session: BackendSession,
    order: Order,
    urls: (orderId: string) => { success: string; failure: string },
  ): Promise<PlacedOrder> {
    try {
      const { redirectUrl } = await backend.checkout.startPayment(
        session,
        order.id,
        urls(order.id),
      );
      return { order, redirectUrl, paymentFailed: false };
    } catch (error) {
      console.error("[checkout] the payment could not be started", error);
      return { order, redirectUrl: null, paymentFailed: true };
    }
  }

  /** The session's order placed since `since`, looking for a while. */
  async function findLanded(
    backend: Backend,
    session: BackendSession,
    since: number,
  ): Promise<Order | null> {
    for (const delay of pollDelaysMs) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const { orders } = await backend.orders.listOrders(session, 1, 1);
        const newest = orders[0];
        if (newest && Date.parse(newest.placedAt) >= since - skewMs) {
          return newest;
        }
      } catch (error) {
        // the backend may still be slow; look again
        if (!isDomainError(error, "backend_unavailable")) {
          if (!isDomainError(error, "unauthenticated")) throw error;
        }
      }
    }
    return null;
  }

  /** The session's newest order if it was placed in the last minutes. */
  async function recentOrder(
    backend: Backend,
    session: BackendSession,
  ): Promise<Order | null> {
    try {
      const { orders } = await backend.orders.listOrders(session, 1, 1);
      const newest = orders[0];
      return newest &&
        Date.parse(newest.placedAt) >= Date.now() - recentMs - skewMs
        ? newest
        : null;
    } catch (error) {
      if (isDomainError(error, "unauthenticated")) return null;
      throw error;
    }
  }

  const keysOf = (args: PlaceArgs) => {
    const sessionKey = `${args.backend.name}\u0000${args.visitorKey}`;
    return {
      sessionKey,
      attemptKey: `${sessionKey}\u0000${args.input.attemptId}`,
    };
  };

  /** The order of an unanswered placement, or `order_status_unknown`. */
  async function resolveUnanswered(
    args: PlaceArgs,
    mark: Unanswered,
  ): Promise<PlacedOrder> {
    const { backend, session, urls } = args;
    const { sessionKey, attemptKey } = keysOf(args);
    const order = await findLanded(backend, session, mark.at);
    if (!order) throw statusUnknown();
    unanswered.delete(sessionKey);
    const placed =
      order.paymentStatus === "open"
        ? await withPayment(backend, session, order, urls)
        : { order, redirectUrl: null, paymentFailed: false };
    bounded(attempts, attemptKey, { at: mark.at, placed });
    return placed;
  }

  async function place(args: PlaceArgs): Promise<PlacedOrder> {
    const { backend, session, input, gates, urls } = args;
    const { sessionKey, attemptKey } = keysOf(args);
    const attempt = known(attemptKey);
    if (attempt?.placed) return attempt.placed;

    // an order request of this session got no answer: never place again
    const mark = pending(sessionKey);
    if (mark) return resolveUnanswered(args, mark);

    const cart = await backend.cart.getCart(session);
    if (!cart.lines.length) {
      // another tab or a reload of a press that placed the order: name
      // it, but never as a new order (no payment, no tracking)
      const recent = await recentOrder(backend, session);
      if (recent) {
        throw new DomainError(
          "order_already_placed",
          "This session placed an order moments ago.",
          { orderId: recent.id },
        );
      }
      throw new DomainError("cart_empty", "The cart holds nothing to order.");
    }

    if (!(await gates.acceptsOrders())) {
      throw new DomainError(
        "ordering_closed",
        "The restaurant does not take orders now.",
      );
    }
    const [schedule, methods] = await Promise.all([
      gates.schedule(),
      gates.shippingMethods(),
    ]);
    const lead = shippingLeadTime(methods, cart.shippingMethodId);
    checkWishedTime(input.wishedTime, now(), schedule, lead.minutes);

    const at = Date.now();
    let order: Order;
    try {
      order = await backend.checkout.placeOrder(session, {
        wishedTime: input.wishedTime,
        fulfillment: lead.fulfillment,
        note: input.note,
      });
    } catch (error) {
      if (!isDomainError(error, "backend_unavailable")) throw error;
      // the request went out and got no answer: the order may exist
      const sent: Unanswered = { at };
      bounded(unanswered, sessionKey, sent);
      return resolveUnanswered(args, sent);
    }
    const placed = await withPayment(backend, session, order, urls);
    bounded(attempts, attemptKey, { at, placed });
    return placed;
  }

  return {
    place,
    /** The answer of an attempt this process placed already, if any. */
    known: (args: PlaceArgs): PlacedOrder | undefined =>
      known(keysOf(args).attemptKey)?.placed,
  };
}

type PlaceArgs = {
  backend: Backend;
  session: BackendSession;
  /** The visitor's session id: attempts of two visitors never mix. */
  visitorKey: string;
  input: PlaceOrderInput;
  gates: PlacementGates;
  urls: (orderId: string) => { success: string; failure: string };
};
