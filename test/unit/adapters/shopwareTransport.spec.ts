import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendRuntimeConfig } from "../../../server/adapters/registry";
import type { BackendSession } from "../../../server/ports";

/**
 * How the Shopware adapter of the running storefront reaches the Store API
 * (ADR 0001, step 8): one private endpoint for every request, shop-wide
 * and per visitor alike (the password reset and the contact form too),
 * with the access key of the private runtime config and a timeout.
 */
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const INTERNAL = "http://shopware:8000/store-api";
const PUBLIC = "https://shop.example/store-api";

/** Shopware JSON by path: a salutation for the contact form, else {}. */
const answer = (url: string) =>
  url.endsWith("/salutation")
    ? {
        elements: [
          {
            id: "0190aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            salutationKey: "not_specified",
          },
        ],
      }
    : {};

function stubFetch() {
  const raw = vi.fn(async (url: string) => ({
    _data: answer(url),
    headers: new Headers({ "sw-context-token": "token-2" }),
  }));
  const plain = vi.fn(async (url: string) => answer(url));
  vi.stubGlobal("$fetch", Object.assign(plain, { raw }));
  return { raw, plain };
}

const config = (
  shopware?: BackendRuntimeConfig["shopware"],
): BackendRuntimeConfig => ({
  shopBite: { backend: "shopware", timeZone: "Europe/Berlin" },
  public: { storeUrl: "https://shop.example" },
  shopware,
});

const session = (token?: string): BackendSession => ({
  read: async () => token,
  write: async () => undefined,
  forwardedFor: "203.0.113.7",
});

async function adapter(
  shopware: BackendRuntimeConfig["shopware"],
  env: Record<string, string | undefined> = {},
) {
  const { shopwareFromRuntimeConfig } =
    await import("../../../server/adapters/shopware");
  return shopwareFromRuntimeConfig(config(shopware), env);
}

const urls = (fetches: ReturnType<typeof stubFetch>) =>
  [...fetches.plain.mock.calls, ...fetches.raw.mock.calls].map((call) =>
    String((call as unknown[])[0]),
  );

describe("the Shopware transport", () => {
  it("asks the private endpoint with the private access key", async () => {
    const fetches = stubFetch();
    const backend = await adapter({ endpoint: INTERNAL, accessToken: "SWSC" });

    await backend.shop.getConfig().catch(() => undefined);
    await backend.cart.getCart(session("token-1")).catch(() => undefined);

    expect(fetches.plain).toHaveBeenCalledWith(
      `${INTERNAL}/shopbite/config`,
      expect.objectContaining({
        headers: expect.objectContaining({ "sw-access-key": "SWSC" }),
        retry: 0,
        timeout: 10_000,
      }),
    );
    expect(fetches.raw).toHaveBeenCalledWith(
      `${INTERNAL}/checkout/cart`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "sw-access-key": "SWSC",
          "sw-context-token": "token-1",
          "x-forwarded-for": "203.0.113.7",
        }),
      }),
    );
  });

  it("sends the password reset to the private endpoint, with the visitor's address chain", async () => {
    // the ADR's open point of step 6: it went to the public endpoint
    const fetches = stubFetch();
    const backend = await adapter(
      { endpoint: INTERNAL, accessToken: "SWSC" },
      { NUXT_PUBLIC_SHOPWARE_ENDPOINT: PUBLIC },
    );

    await backend.customer.requestPasswordReset(
      session(),
      "guest@example.com",
      "https://shop.example",
    );

    const reset = [...fetches.plain.mock.calls, ...fetches.raw.mock.calls].find(
      (call) =>
        String((call as unknown[])[0]).endsWith("/account/recovery-password"),
    ) as unknown as [string, { headers: Record<string, string> }] | undefined;
    expect(reset?.[0]).toBe(`${INTERNAL}/account/recovery-password`);
    expect(reset?.[1].headers).toMatchObject({
      "sw-access-key": "SWSC",
      "x-forwarded-for": "203.0.113.7",
    });
    expect(urls(fetches).every((url) => url.startsWith(INTERNAL))).toBe(true);
  });

  it("sends the contact form to the private endpoint", async () => {
    const fetches = stubFetch();
    const backend = await adapter({ endpoint: INTERNAL, accessToken: "SWSC" });

    await backend.contact
      .send(
        {
          salutation: null,
          firstName: null,
          lastName: null,
          phone: null,
          email: "guest@example.com",
          subject: "Frage",
          message: "Habt ihr heute offen?",
        },
        { forwardedFor: "203.0.113.7" },
      )
      .catch(() => undefined);

    expect(urls(fetches)).toContain(`${INTERNAL}/contact-form`);
    expect(urls(fetches).every((url) => url.startsWith(INTERNAL))).toBe(true);
  });

  it("reads the public names of 2.x from the server's environment", async () => {
    const fetches = stubFetch();
    const backend = await adapter(
      { endpoint: "", accessToken: "" },
      {
        NUXT_PUBLIC_SHOPWARE_ENDPOINT: PUBLIC,
        NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN: "SWSCOLD",
      },
    );

    await backend.shop.getConfig().catch(() => undefined);

    expect(fetches.plain).toHaveBeenCalledWith(
      `${PUBLIC}/shopbite/config`,
      expect.objectContaining({
        headers: expect.objectContaining({ "sw-access-key": "SWSCOLD" }),
      }),
    );
  });

  it("takes a longer timeout for a request that needs one (the order)", async () => {
    const fetches = stubFetch();
    const { createShopwareTransport } =
      await import("../../../server/adapters/shopware/transport");
    const { visitorApi } = createShopwareTransport({
      endpoint: INTERNAL,
      accessToken: "SWSC",
    });

    await visitorApi.send({
      method: "POST",
      path: "/checkout/order",
      body: {},
      timeoutMs: 60_000,
    });

    expect(fetches.raw).toHaveBeenCalledWith(
      `${INTERNAL}/checkout/order`,
      expect.objectContaining({ timeout: 60_000, retry: 0 }),
    );
  });

  it("answers the token Shopware holds the visitor's context under", async () => {
    stubFetch();
    const { createShopwareTransport } =
      await import("../../../server/adapters/shopware/transport");
    const { visitorApi } = createShopwareTransport({
      endpoint: INTERNAL,
      accessToken: "SWSC",
    });

    await expect(
      visitorApi.send({ method: "GET", path: "/checkout/cart" }),
    ).resolves.toEqual({ data: {}, contextToken: "token-2" });
  });
});
