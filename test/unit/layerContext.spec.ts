import { describe, expect, it, vi } from "vitest";
import {
  LAYER_CONTEXT_TIMEOUT_MS,
  readLayerContext,
} from "../../app/utils/layerContext";

// The Shopware layer's context read during server-side rendering (price
// format): a deadline, and neither token nor customer in the page payload.
describe("readLayerContext", () => {
  it("asks with a 10 s deadline and keeps token and customer out", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        token: "secret-token",
        customer: { email: "gina@example.de" },
        currency: { isoCode: "EUR" },
        shippingLocation: {
          country: { iso: "DE" },
          address: { street: "Ginaweg 1", customerId: "gina" },
        },
      },
    }));
    const context = await readLayerContext({ invoke });
    expect(LAYER_CONTEXT_TIMEOUT_MS).toBe(10_000);
    expect(invoke).toHaveBeenCalledWith("readContext get /context", {
      fetchOptions: { timeout: 10_000 },
    });
    // the customer's own address is no layer matter in the payload
    expect(context).toEqual({
      currency: { isoCode: "EUR" },
      shippingLocation: { country: { iso: "DE" } },
    });
  });
});
