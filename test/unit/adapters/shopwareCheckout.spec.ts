import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../../server/adapters/shopware";
import { SHIPPING_METHOD_CRITERIA } from "../../../server/adapters/shopware/checkout";
import { isDomainError } from "../../../shared/domain";

const checkoutOf = (
  plugin: unknown,
  methods: unknown,
  log: (message: string, details: unknown) => void = () => {},
) => {
  const post = vi.fn(async () => methods);
  const storeApi: StoreApi = {
    get: async <T>() => plugin as T,
    post: post as StoreApi["post"],
  };
  const checkout = createShopwareBackend({
    storeApi,
    storeUrl: "",
    timeZone: "Europe/Berlin",
    log,
  }).checkout;
  return { checkout, post };
};

describe("Shopware CheckoutPort adapter (anti-corruption)", () => {
  it("asks the Store API for the shop's methods with the domain's fields only", async () => {
    const { checkout, post } = checkoutOf({ shippingMethods: [] }, {});
    expect(await checkout.listShippingMethods()).toEqual([]);
    expect(post).toHaveBeenCalledWith(
      "/shipping-method",
      SHIPPING_METHOD_CRITERIA,
    );
  });

  it("takes a method the plugin does not list for a delivery without lead time", async () => {
    const { checkout } = checkoutOf(
      { shippingMethods: [] },
      { elements: [{ id: "m1", name: "Kurier", translated: {} }] },
    );
    expect(await checkout.listShippingMethods()).toEqual([
      {
        id: "m1",
        name: "Kurier",
        description: null,
        fulfillment: "delivery",
        leadTime: null,
        media: null,
      },
    ]);
  });

  it("takes a missing lead time as unknown without logging it", async () => {
    const log = vi.fn();
    const { checkout } = checkoutOf(
      {
        shippingMethods: [
          { id: "m1", fulfillment: "pickup", leadTimeMinutes: null },
        ],
      },
      { elements: [{ id: "m1", name: "Abholung" }] },
      log,
    );
    const [method] = await checkout.listShippingMethods();
    expect(method).toMatchObject({ fulfillment: "pickup", leadTime: null });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs a lead time it cannot read once, not on every request", async () => {
    const log = vi.fn();
    const { checkout } = checkoutOf(
      {
        shippingMethods: [
          { id: "m1", fulfillment: "pickup", leadTimeMinutes: -5 },
        ],
      },
      { elements: [{ id: "m1", name: "Abholung" }] },
      log,
    );
    await checkout.listShippingMethods();
    await checkout.listShippingMethods();
    expect(log).toHaveBeenCalledOnce();
  });

  it("fails as a whole when only the method names cannot be loaded", async () => {
    const storeApi: StoreApi = {
      get: async <T>() => ({ shippingMethods: [] }) as T,
      post: () => Promise.reject(new Error("fetch failed")),
    };
    const { checkout } = createShopwareBackend({
      storeApi,
      storeUrl: "",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
    const failure = await checkout.listShippingMethods().catch((e) => e);
    expect(isDomainError(failure, "backend_unavailable")).toBe(true);
  });

  it("reads the plugin configuration once for config and shipping methods asked together", async () => {
    const get = vi.fn(async () => ({
      isCheckoutEnabled: true,
      shippingMethods: [],
    }));
    const storeApi: StoreApi = {
      get: get as StoreApi["get"],
      post: async <T>() => ({ elements: [] }) as T,
    };
    const backend = createShopwareBackend({
      storeApi,
      storeUrl: "",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
    await Promise.all([
      backend.shop.getConfig(),
      backend.checkout.listShippingMethods(),
    ]);
    const configReads = () =>
      (get.mock.calls as unknown as [string][]).filter(
        ([path]) => path === "/shopbite/config",
      ).length;
    expect(configReads()).toBe(1);
    // not cached beyond the request in flight
    await backend.shop.getConfig();
    expect(configReads()).toBe(2);
  });

  it("logs and drops a lead time the domain cannot express", async () => {
    const log = vi.fn();
    const { checkout } = checkoutOf(
      {
        shippingMethods: [
          { id: "m1", fulfillment: "pickup", leadTimeMinutes: 1440 },
        ],
      },
      { elements: [{ id: "m1", name: "Abholung" }] },
      log,
    );
    const [method] = await checkout.listShippingMethods();
    expect(method).toMatchObject({ fulfillment: "pickup", leadTime: null });
    expect(log).toHaveBeenCalledOnce();
  });

  it("maps the method's image with its thumbnails", async () => {
    const { checkout } = checkoutOf(
      { shippingMethods: [] },
      {
        elements: [
          {
            id: "m1",
            name: "Lieferung",
            media: {
              url: "https://cdn.example.com/rad.png",
              alt: "Fahrrad",
              metaData: { width: 400, height: 200 },
              thumbnails: [
                { url: "https://cdn.example.com/rad-200.png", width: 200 },
              ],
            },
          },
        ],
      },
    );
    const [method] = await checkout.listShippingMethods();
    expect(method?.media).toEqual({
      url: "https://cdn.example.com/rad.png",
      alt: "Fahrrad",
      width: 400,
      height: 200,
      sources: [{ url: "https://cdn.example.com/rad-200.png", width: 200 }],
    });
  });

  it("reports a failing Store API as backend_unavailable", async () => {
    const storeApi: StoreApi = {
      get: () => Promise.reject(new Error("fetch failed")),
      post: async <T>() => ({ elements: [] }) as T,
    };
    const { checkout } = createShopwareBackend({
      storeApi,
      storeUrl: "",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
    const failure = await checkout.listShippingMethods().catch((e) => e);
    expect(isDomainError(failure, "backend_unavailable")).toBe(true);
  });

  it("still rejects the checkout methods of later steps", async () => {
    const { checkout } = checkoutOf({}, {});
    const failure = await checkout.listPaymentMethods().catch((e) => e);
    expect(isDomainError(failure, "not_implemented")).toBe(true);
  });
});
