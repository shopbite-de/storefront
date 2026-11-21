import { describe, expect, it } from "vitest";
import { createMemoryBackend, demoSeed } from "../../server/adapters/memory";
import type { Backend } from "../../server/ports";
import {
  checkWishedTime,
  createOrderPlacement,
  type PlacementGates,
} from "../../server/utils/orderPlacement";
import {
  DomainError,
  dishConfiguration,
  isDomainError,
  openingInterval,
  timeZone,
  wishedTime,
  type ServiceSchedule,
  type Weekday,
} from "../../shared/domain";
import { testSession } from "../contract/cart.contract";
import { GUEST, STOREFRONT_URL } from "../contract/ordering.contract";

const berlin = timeZone("Europe/Berlin");
/** Saturday 21 November 2026, 17:00 in Berlin. */
const NOW = new Date("2026-11-21T16:00:00Z");

const allDay: ServiceSchedule = {
  timeZone: berlin,
  openingHours: {
    intervals: ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((weekday) => ({
      weekday,
      interval: openingInterval("11:00", "22:00"),
    })),
  },
  holidays: [],
};

function gates(overrides: Partial<PlacementGates> = {}): PlacementGates {
  const seed = demoSeed();
  return {
    acceptsOrders: async () => true,
    schedule: async () => allDay,
    shippingMethods: async () => seed.checkout.shippingMethods,
    ...overrides,
  };
}

async function guestWithMargherita(backend: Backend) {
  const session = testSession();
  const dish = demoSeed().catalog.dishes.find(
    (entry) => entry.variants.length === 0,
  )!;
  await backend.cart.addLine(
    session,
    dishConfiguration({ dishId: dish.id }),
    1,
  );
  await backend.checkout.registerGuest(session, GUEST, STOREFRONT_URL);
  return session;
}

const input = (attemptId = "attempt-0001") => ({
  attemptId,
  // 17:00 plus 30 minutes of delivery
  wishedTime: wishedTime("2026-11-21", "17:30"),
  note: null,
});

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

describe("placing an order once", () => {
  it("answers a repeated attempt with the order placed first", async () => {
    const backend = createMemoryBackend();
    const session = await guestWithMargherita(backend);
    const placement = createOrderPlacement({ now: () => NOW });
    const args = {
      backend,
      session,
      visitorKey: "visitor-1",
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
    };
    const first = await placement.place({ ...args, input: input() });
    const again = await placement.place({ ...args, input: input() });
    expect(again).toEqual(first);
    expect(first.order.number).toMatch(/\S/);
    expect(first.redirectUrl).toBeNull();
    expect(first.paymentFailed).toBe(false);
    expect((await backend.orders.listOrders(session)).total).toBe(1);
  });

  /**
   * A backend that is slower than the storefront waits: the order request
   * is unanswered (`backend_unavailable`) while the cart still holds the
   * lines; the order lands `landsAfterMs` later (or never).
   */
  function slowBackend(landsAfterMs: number | null) {
    const memory = createMemoryBackend();
    let calls = 0;
    const backend: Backend = {
      ...memory,
      checkout: {
        ...memory.checkout,
        placeOrder: async (session, command) => {
          calls++;
          if (landsAfterMs !== null) {
            setTimeout(() => {
              void memory.checkout.placeOrder(session, command);
            }, landsAfterMs);
          }
          throw new DomainError("backend_unavailable", "No answer.");
        },
      },
    };
    return { backend, calls: () => calls };
  }

  const fastPolls = { pollDelaysMs: [0, 20, 40, 80] };

  it("finds the order of an attempt whose answer did not come, without placing again", async () => {
    const { backend, calls } = slowBackend(30);
    const session = await guestWithMargherita(backend);
    const placement = createOrderPlacement({ now: () => NOW, ...fastPolls });
    const args = {
      backend,
      session,
      visitorKey: "visitor-1",
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
      input: input(),
    };
    // the request itself waits for the order to show up
    const placed = await placement.place(args);
    const orders = await backend.orders.listOrders(session);
    expect(orders.total).toBe(1);
    expect(placed.order.id).toBe(orders.orders[0]?.id);
    expect(calls()).toBe(1);
    // and a retry of the attempt answers it again
    expect((await placement.place(args)).order.id).toBe(placed.order.id);
    expect(calls()).toBe(1);
  });

  it("says the outcome is unknown and never places again while an order may still land", async () => {
    const { backend, calls } = slowBackend(null);
    const session = await guestWithMargherita(backend);
    const placement = createOrderPlacement({ now: () => NOW, ...fastPolls });
    const args = {
      backend,
      session,
      visitorKey: "visitor-1",
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
      input: input(),
    };
    for (const attemptId of ["attempt-0001", "attempt-0001", "attempt-0002"]) {
      const error = await rejection(() =>
        placement.place({ ...args, input: input(attemptId) }),
      );
      expect([attemptId, (error as DomainError).code]).toEqual([
        attemptId,
        "order_status_unknown",
      ]);
    }
    // the cart is still full, yet the backend was asked once only
    expect((await backend.cart.getCart(session)).lines).toHaveLength(1);
    expect(calls()).toBe(1);
  });

  it("answers a fresh attempt with an empty cart with the order just placed, never as a new one", async () => {
    const backend = createMemoryBackend();
    const session = await guestWithMargherita(backend);
    const args = {
      backend,
      session,
      visitorKey: "visitor-1",
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
      input: input(),
    };
    const placement = createOrderPlacement({ now: () => NOW });
    const placed = await placement.place(args);
    // a second tab, a new press of the order button: no fresh success,
    // but the order the session placed a moment ago
    for (const run of [
      () => placement.place({ ...args, input: input("attempt-0002") }),
      // another instance knows no attempt either
      () => createOrderPlacement({ now: () => NOW }).place(args),
    ]) {
      const error = await rejection(run);
      expect(isDomainError(error, "order_already_placed")).toBe(true);
      expect((error as DomainError).details).toEqual({
        orderId: placed.order.id,
      });
    }
    expect((await backend.orders.listOrders(session)).total).toBe(1);
  });

  it("keeps two visitors' attempts apart", async () => {
    const backend = createMemoryBackend();
    const placement = createOrderPlacement({ now: () => NOW });
    const common = {
      backend,
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
      input: input(),
    };
    const first = await placement.place({
      ...common,
      session: await guestWithMargherita(backend),
      visitorKey: "visitor-1",
    });
    const second = await placement.place({
      ...common,
      session: await guestWithMargherita(backend),
      visitorKey: "visitor-2",
    });
    expect(second.order.id).not.toBe(first.order.id);
  });

  it("refuses an empty cart", async () => {
    const backend = createMemoryBackend();
    const session = testSession();
    await backend.checkout.registerGuest(session, GUEST, STOREFRONT_URL);
    const error = await rejection(() =>
      createOrderPlacement({ now: () => NOW }).place({
        backend,
        session,
        visitorKey: "visitor-1",
        gates: gates(),
        urls: () => ({ success: "s", failure: "f" }),
        input: input(),
      }),
    );
    expect(isDomainError(error, "cart_empty")).toBe(true);
  });

  it("does not order while the restaurant takes no orders", async () => {
    const backend = createMemoryBackend();
    const session = await guestWithMargherita(backend);
    const error = await rejection(() =>
      createOrderPlacement({ now: () => NOW }).place({
        backend,
        session,
        visitorKey: "visitor-1",
        gates: gates({ acceptsOrders: async () => false }),
        urls: () => ({ success: "s", failure: "f" }),
        input: input(),
      }),
    );
    expect(isDomainError(error, "ordering_closed")).toBe(true);
    expect((await backend.orders.listOrders(session)).total).toBe(0);
  });

  it("refuses a wished time outside the ordering window", async () => {
    const backend = createMemoryBackend();
    const session = await guestWithMargherita(backend);
    const error = await rejection(() =>
      createOrderPlacement({ now: () => NOW }).place({
        backend,
        session,
        visitorKey: "visitor-1",
        gates: gates(),
        urls: () => ({ success: "s", failure: "f" }),
        input: { ...input(), wishedTime: wishedTime("2026-11-21", "17:10") },
      }),
    );
    expect(isDomainError(error, "outside_ordering_window")).toBe(true);
    expect((await backend.orders.listOrders(session)).total).toBe(0);
  });

  it("keeps the order when its payment cannot be started", async () => {
    const memory = createMemoryBackend();
    const backend: Backend = {
      ...memory,
      checkout: {
        ...memory.checkout,
        startPayment: async () => {
          throw new DomainError("backend_unavailable", "No answer.");
        },
      },
    };
    const session = await guestWithMargherita(backend);
    const placed = await createOrderPlacement({ now: () => NOW }).place({
      backend,
      session,
      visitorKey: "visitor-1",
      gates: gates(),
      urls: () => ({ success: "s", failure: "f" }),
      input: input(),
    });
    expect(placed.paymentFailed).toBe(true);
    expect(placed.redirectUrl).toBeNull();
  });
});

describe("the wished time within the ordering window", () => {
  const check = (date: string, time: string, lead = 30, now = NOW) =>
    checkWishedTime(wishedTime(date, time), now, allDay, lead);

  it("takes a time from now plus the lead time to the end of the span", () => {
    expect(() => check("2026-11-21", "17:30")).not.toThrow();
    expect(() => check("2026-11-21", "22:00")).not.toThrow();
    expect(() => check("2026-11-21", "17:15", 15)).not.toThrow();
  });

  it("allows one grid step for the browser's clock", () => {
    expect(() => check("2026-11-21", "17:25")).not.toThrow();
    expect(() => check("2026-11-21", "17:20")).toThrow(/window/);
  });

  it("refuses times after closing, on another day, or when closed", () => {
    expect(() => check("2026-11-21", "22:05")).toThrow(/window/);
    expect(() => check("2026-11-22", "12:00")).toThrow(/window/);
    expect(() =>
      check("2026-11-21", "23:00", 30, new Date("2026-11-21T21:50:00Z")),
    ).toThrow(/window/);
  });
});
