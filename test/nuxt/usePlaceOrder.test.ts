import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody, type H3Event } from "h3";
import { usePlaceOrder } from "~/composables/usePlaceOrder";

// The order button (ADR 0001, step 5): one attempt id per press, the same
// id on every retry, so the server never places a second order.
const { mockOrders } = vi.hoisted(() => ({ mockOrders: vi.fn() }));

registerEndpoint("/api/checkout/orders", async (event: H3Event) =>
  mockOrders(await readBody(event)),
);

const placed = {
  order: { id: "o-1" },
  redirectUrl: null,
  paymentFailed: false,
};
const failing = (statusCode: number, code: string) =>
  createError({ statusCode, data: { code } });

describe("usePlaceOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("sends the wished time with an attempt id", async () => {
    mockOrders.mockResolvedValue(placed);
    const answer = await usePlaceOrder().placeOrder({
      wishedTime: { date: "2026-11-21", time: "18:40" },
    });
    expect(answer).toEqual(placed);
    const [body] = mockOrders.mock.calls[0]!;
    expect(body).toEqual({
      attemptId: expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/),
      wishedTime: { date: "2026-11-21", time: "18:40" },
      note: null,
    });
  });

  it("retries an outdated session with the same attempt", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    mockOrders
      .mockRejectedValueOnce(failing(409, "stale_session"))
      .mockResolvedValueOnce(placed);
    const answer = usePlaceOrder().placeOrder({
      wishedTime: { date: "2026-11-21", time: "18:40" },
    });
    await vi.runAllTimersAsync();
    expect(await answer).toEqual(placed);
    const ids = mockOrders.mock.calls.map(([body]) => body.attemptId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(1);
  });

  it("never sends an order again on its own after a failure without answer", async () => {
    for (const failure of [
      failing(503, "backend_unavailable"),
      failing(409, "order_status_unknown"),
    ]) {
      mockOrders.mockReset();
      mockOrders.mockRejectedValueOnce(failure).mockResolvedValue(placed);
      await expect(
        usePlaceOrder().placeOrder({
          wishedTime: { date: "2026-11-21", time: "18:40" },
        }),
      ).rejects.toBeTruthy();
      expect(mockOrders).toHaveBeenCalledTimes(1);
    }
  });

  it("does not retry a refusal, and the next press is a new attempt", async () => {
    mockOrders.mockRejectedValueOnce(failing(409, "ordering_closed"));
    const { placeOrder } = usePlaceOrder();
    await expect(
      placeOrder({ wishedTime: { date: "2026-11-21", time: "18:40" } }),
    ).rejects.toBeTruthy();
    expect(mockOrders).toHaveBeenCalledTimes(1);

    mockOrders.mockResolvedValueOnce(placed);
    await placeOrder({ wishedTime: { date: "2026-11-21", time: "18:40" } });
    const [first, second] = mockOrders.mock.calls.map(
      ([body]) => body.attemptId,
    );
    expect(second).not.toBe(first);
  });
});
