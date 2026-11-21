import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { readBody, type H3Event } from "h3";
import { useOrder } from "~/composables/useOrder";

// An order of the session through the BFF (ADR 0001, step 5): the order
// pages and the payment retry.
const { mockOrder, mockPayment } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockPayment: vi.fn(),
}));

registerEndpoint("/api/orders/order-1", () => mockOrder());
registerEndpoint("/api/orders/order-1/payment", async (event: H3Event) =>
  mockPayment(await readBody(event)),
);

describe("useOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the order of the session", async () => {
    mockOrder.mockResolvedValue({ id: "order-1", number: "10042" });
    const { order, load } = useOrder("order-1");
    await load();
    expect(order.value).toEqual({ id: "order-1", number: "10042" });
  });

  it("retries the payment, with another method if chosen", async () => {
    mockPayment.mockResolvedValue({ redirectUrl: "https://pay.example/1" });
    const { retryPayment } = useOrder("order-1");
    expect(await retryPayment("pm-2")).toBe("https://pay.example/1");
    expect(mockPayment).toHaveBeenCalledWith({ paymentMethodId: "pm-2" });

    mockPayment.mockResolvedValue({ redirectUrl: null });
    expect(await retryPayment(null)).toBeNull();
    expect(mockPayment).toHaveBeenLastCalledWith({ paymentMethodId: null });
  });
});
