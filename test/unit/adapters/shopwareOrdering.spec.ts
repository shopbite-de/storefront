import { describe, expect, it } from "vitest";
import {
  createShopwareBackend,
  type VisitorStoreApi,
} from "../../../server/adapters/shopware";
import {
  orderComment,
  readComment,
} from "../../../server/adapters/shopware/ordering";
import {
  dishConfiguration,
  isDomainError,
  timeZone,
  wishedTime,
} from "../../../shared/domain";
import { COLA, testSession } from "../../contract/cart.contract";
import { httpError } from "../../contract/cartFixtures";
import {
  GUEST,
  RESTAURANT,
  STOREFRONT_URL,
  WISHED,
} from "../../contract/ordering.contract";
import { fakeShopwareOrdering, GERMANY } from "../../contract/orderingFixtures";

type Request = Parameters<VisitorStoreApi["send"]>[0];

/**
 * The Shopware adapter over the ordering fake; `intercept` may answer (or
 * fail) a visitor request before the fake does.
 */
function backend(
  intercept?: (
    request: Request,
    fake: ReturnType<typeof fakeShopwareOrdering>,
  ) => Promise<unknown> | undefined,
  options: {
    requestTimeoutMs?: number;
    orderTimeoutMs?: number;
    countryId?: string;
  } = {},
  shop?: {
    get?: (path: string) => Promise<unknown> | undefined;
  },
) {
  const fake = fakeShopwareOrdering(RESTAURANT);
  const sent: Request[] = [];
  const visitorApi: VisitorStoreApi = {
    send: async <T>(request: Request) => {
      sent.push(structuredClone(request));
      const answer = intercept?.(request, fake);
      if (answer) {
        return {
          data: (await answer) as T,
          contextToken: request.contextToken ?? null,
        };
      }
      return fake.visitorApi.send<T>(request);
    },
  };
  const storeApi = {
    get: <T>(path: string) =>
      (shop?.get?.(path) as Promise<T> | undefined) ??
      fake.storeApi.get<T>(path),
    post: fake.storeApi.post,
  };
  const shopware = createShopwareBackend({
    storeApi,
    visitorApi,
    countryId: GERMANY,
    storeUrl: "https://shop.example.com",
    timeZone: "Europe/Berlin",
    log: () => {},
    ...options,
  });
  return { shopware, sent, fake };
}

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

async function guestWithCola(shopware: ReturnType<typeof backend>["shopware"]) {
  const session = testSession();
  await shopware.cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);
  await shopware.checkout.registerGuest(session, GUEST, STOREFRONT_URL);
  return session;
}

const bodiesOf = (sent: Request[], path: string) =>
  sent
    .filter((request) => request.path === path)
    .map((request) => request.body);

describe("Shopware ordering adapter", () => {
  it("registers a guest with the request of the 2.x checkout form", async () => {
    const { shopware, sent } = backend();
    const session = testSession();
    await shopware.checkout.registerGuest(
      session,
      {
        ...GUEST,
        billingAddress: {
          ...GUEST.billingAddress,
          firstName: "",
          lastName: "",
        },
      },
      "https://shop.example.com/",
    );
    expect(bodiesOf(sent, "/account/register")).toEqual([
      {
        accountType: "private",
        email: "max@example.com",
        firstName: "Max",
        lastName: "Muster",
        guest: true,
        acceptedDataProtection: true,
        storefrontUrl: "https://shop.example.com",
        billingAddress: {
          firstName: "Max",
          lastName: "Muster",
          company: "",
          department: "",
          salutationId: "",
          street: "Musterstraße 1",
          additionalAddressLine1: "",
          zipcode: "12345",
          city: "Musterstadt",
          countryId: "f0e1d2c3b4a54968a7b6c5d4e3f2a1b0",
          phoneNumber: "0123456789",
        },
      },
    ]);
    // Shopware issued a new token for the guest: it is the session's now
    expect(session.state()).toMatch(/^context-guest-/);
  });

  it("finds the country by its code, within the Store API's limit", async () => {
    const { shopware, sent, fake } = backend();
    await shopware.checkout.registerGuest(
      testSession(),
      {
        ...GUEST,
        billingAddress: { ...GUEST.billingAddress, country: "AT" },
      },
      STOREFRONT_URL,
    );
    const [body] = bodiesOf(sent, "/account/register") as {
      billingAddress: { countryId: string };
    }[];
    expect(body?.billingAddress.countryId).toBe(
      "a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d",
    );
    const lookups = fake.requests.filter(
      (request) => request.path === "/country",
    );
    expect(lookups.length).toBeGreaterThan(0);
    for (const lookup of lookups) {
      expect(lookup.body?.filter).toEqual([
        { type: "equals", field: "iso", value: "AT" },
      ]);
    }
  });

  it("refuses a country the shop does not deliver to", async () => {
    const { shopware } = backend();
    const error = await rejection(() =>
      shopware.checkout.registerGuest(
        testSession(),
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, country: "FR" },
        },
        STOREFRONT_URL,
      ),
    );
    expect(isDomainError(error, "invalid_value")).toBe(true);
  });

  it("sends a business guest with another delivery address", async () => {
    const { shopware, sent } = backend();
    await shopware.checkout.registerGuest(
      testSession(),
      {
        ...GUEST,
        business: true,
        billingAddress: {
          ...GUEST.billingAddress,
          company: "Muster GmbH",
          department: "Einkauf",
        },
        deliveryAddress: {
          ...GUEST.billingAddress,
          firstName: "Erika",
          street: "Nebenweg 2",
        },
      },
      STOREFRONT_URL,
    );
    const [body] = bodiesOf(sent, "/account/register") as Record<
      string,
      unknown
    >[];
    expect(body?.accountType).toBe("business");
    expect(body?.billingAddress).toMatchObject({
      company: "Muster GmbH",
      department: "Einkauf",
    });
    expect(body?.shippingAddress).toMatchObject({
      firstName: "Erika",
      street: "Nebenweg 2",
      company: "",
      salutationId: "",
    });
  });

  it("refuses details Shopware's validation refuses, naming the fields", async () => {
    const { shopware } = backend((request) =>
      request.path === "/account/register"
        ? Promise.reject(
            Object.assign(httpError(400, "VIOLATION::IS_BLANK_ERROR"), {
              data: {
                errors: [
                  {
                    code: "VIOLATION::IS_BLANK_ERROR",
                    source: { pointer: "/billingAddress/zipcode" },
                  },
                ],
              },
            }),
          )
        : undefined,
    );
    const error = await rejection(() =>
      shopware.checkout.registerGuest(testSession(), GUEST, STOREFRONT_URL),
    );
    expect(isDomainError(error, "validation_failed")).toBe(true);
    expect((error as { details: unknown }).details).toEqual({
      fields: ["billingAddress.zipcode"],
    });
  });

  it("changes an address with the request of the 2.x address form", async () => {
    const { shopware, sent } = backend();
    const session = testSession();
    const orderer = await shopware.checkout.registerGuest(
      session,
      GUEST,
      STOREFRONT_URL,
    );
    await shopware.checkout.updateAddress(session, {
      ...orderer.billingAddress,
      street: "Neue Straße 5",
    });
    const id = orderer.billingAddress.id;
    expect(bodiesOf(sent, `/account/address/${id}`)).toEqual([
      {
        firstName: "Max",
        lastName: "Muster",
        company: "",
        department: "",
        street: "Neue Straße 5",
        additionalAddressLine1: "",
        zipcode: "12345",
        city: "Musterstadt",
        countryId: "f0e1d2c3b4a54968a7b6c5d4e3f2a1b0",
        phoneNumber: "0123456789",
        id,
      },
    ]);
    expect(
      sent.find((request) => request.path === `/account/address/${id}`)?.method,
    ).toBe("PATCH");
  });

  it("orders with nothing but the wished time in the customer comment", async () => {
    const { shopware, sent } = backend();
    const session = await guestWithCola(shopware);
    await shopware.checkout.placeOrder(session, {
      wishedTime: WISHED,
      fulfillment: "pickup",
      note: null,
    });
    await shopware.cart.addLine(
      session,
      dishConfiguration({ dishId: COLA }),
      1,
    );
    await shopware.checkout.placeOrder(session, {
      wishedTime: wishedTime("2026-11-21", "09:05"),
      fulfillment: "delivery",
      note: null,
    });
    expect(bodiesOf(sent, "/checkout/order")).toEqual([
      { customerComment: "Wunschabholzeit: 18:40" },
      { customerComment: "Wunschlieferzeit: 09:05" },
    ]);
  });

  it("sends the order once, also when Shopware does not answer in time", async () => {
    const { shopware, sent } = backend(
      (request) =>
        request.path === "/checkout/order" ? new Promise(() => {}) : undefined,
      { requestTimeoutMs: 20, orderTimeoutMs: 30 },
    );
    const session = await guestWithCola(shopware);
    const error = await rejection(() =>
      shopware.checkout.placeOrder(session, {
        wishedTime: WISHED,
        fulfillment: "delivery",
        note: null,
      }),
    );
    expect(isDomainError(error, "backend_unavailable")).toBe(true);
    expect(bodiesOf(sent, "/checkout/order")).toHaveLength(1);
  });

  it("does not send a locked or failed order again", async () => {
    for (const failure of [
      httpError(409, "CHECKOUT__CART_LOCKED"),
      httpError(500, "FRAMEWORK__INTERNAL"),
    ]) {
      const { shopware, sent } = backend((request) =>
        request.path === "/checkout/order"
          ? Promise.reject(failure)
          : undefined,
      );
      const session = await guestWithCola(shopware);
      const error = await rejection(() =>
        shopware.checkout.placeOrder(session, {
          wishedTime: WISHED,
          fulfillment: "delivery",
          note: null,
        }),
      );
      expect(isDomainError(error, "backend_unavailable")).toBe(true);
      expect(bodiesOf(sent, "/checkout/order")).toHaveLength(1);
    }
  });

  it("names the plugin's refusals by the cart's errors", async () => {
    const cases: [string, string][] = [
      ["shopbite-ordering-closed", "ordering_closed"],
      ["shopbite-ordering-holiday", "ordering_closed"],
      ["shopbite-ordering-paused", "ordering_closed"],
      ["shipping-method-blocked", "shipping_method_blocked"],
      ["payment-method-blocked", "payment_method_blocked"],
      ["product-not-found", "dish_unavailable"],
      ["something-else", "validation_failed"],
    ];
    for (const [key, code] of cases) {
      const { shopware } = backend((request) => {
        if (request.path === "/checkout/order") {
          return Promise.reject(httpError(400, "CHECKOUT__CART_INVALID"));
        }
        if (request.path === "/checkout/cart" && request.method === "GET") {
          return Promise.resolve({
            token: request.contextToken,
            lineItems: [],
            errors: { [key]: { key, messageKey: key, level: 20 } },
          });
        }
        return undefined;
      });
      const session = await guestWithCola(shopware);
      const error = await rejection(() =>
        shopware.checkout.placeOrder(session, {
          wishedTime: WISHED,
          fulfillment: "delivery",
          note: null,
        }),
      );
      expect([key, (error as { code?: string }).code]).toEqual([key, code]);
    }
  });

  it("keeps the context token out of errors and sends the visitor's address", async () => {
    const { shopware, sent } = backend((request) =>
      request.path === "/checkout/order"
        ? Promise.reject(
            Object.assign(
              new Error(`Cart with token ${request.contextToken} is locked`),
              { statusCode: 503 },
            ),
          )
        : undefined,
    );
    const session = Object.assign(await guestWithCola(shopware), {
      forwardedFor: "203.0.113.7",
    });
    const error = (await rejection(() =>
      shopware.checkout.placeOrder(session, {
        wishedTime: WISHED,
        fulfillment: "delivery",
        note: null,
      }),
    )) as Error;
    const token = session.state()!;
    expect(error.message).not.toContain(token);
    expect(String((error.cause as Error).message)).not.toContain(token);
    expect(
      sent.find((request) => request.path === "/checkout/order")?.forwardedFor,
    ).toBe("203.0.113.7");
  });

  it("reads no other visitor's order: Shopware's 403 is not found", async () => {
    const { shopware } = backend((request) =>
      request.path === "/order"
        ? Promise.reject(httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN"))
        : undefined,
    );
    const session = testSession("some-token");
    const error = await rejection(() =>
      shopware.orders.getOrder(session, "0123456789abcdef0123456789abcdef"),
    );
    expect(isDomainError(error, "not_found")).toBe(true);
  });
});

describe("Shopware ordering adapter: as the 2.x storefront did", () => {
  it("puts a guest without a country into the configured country, without a lookup", async () => {
    const { shopware, sent, fake } = backend();
    await shopware.checkout.registerGuest(
      testSession(),
      { ...GUEST, billingAddress: { ...GUEST.billingAddress, country: null } },
      STOREFRONT_URL,
    );
    const [body] = bodiesOf(sent, "/account/register") as {
      billingAddress: { countryId: string };
    }[];
    expect(body?.billingAddress.countryId).toBe(GERMANY);
    expect(fake.requests.some((request) => request.path === "/country")).toBe(
      false,
    );
  });

  it("refuses a guest without a country when the shop configured none", async () => {
    const { shopware } = backend(undefined, { countryId: "" });
    const error = await rejection(() =>
      shopware.checkout.registerGuest(
        testSession(),
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, country: null },
        },
        STOREFRONT_URL,
      ),
    );
    expect(isDomainError(error, "invalid_value")).toBe(true);
  });

  it("waits for the order longer than for other requests", async () => {
    const { shopware, sent } = backend(
      (request, fake) =>
        request.path === "/checkout/order"
          ? new Promise((resolve) => setTimeout(resolve, 60))
              .then(() => fake.visitorApi.send(request))
              .then((answer) => answer.data)
          : undefined,
      { requestTimeoutMs: 20, orderTimeoutMs: 1000 },
    );
    const session = await guestWithCola(shopware);
    const order = await shopware.checkout.placeOrder(session, {
      wishedTime: WISHED,
      fulfillment: "delivery",
      note: null,
    });
    expect(order.number).toMatch(/\S/);
    expect(bodiesOf(sent, "/checkout/order")).toHaveLength(1);
  });

  it("gives the transport the order's own deadline (a placement answering after 15 s)", async () => {
    // the transport honours the request's timeout, like storeApiForVisitor
    const { shopware, sent } = backend(
      (request, fake) =>
        request.path === "/checkout/order"
          ? new Promise((resolve, reject) => {
              const limit = request.timeoutMs ?? 10;
              setTimeout(
                () =>
                  limit < 150
                    ? reject(new Error("aborted by the transport"))
                    : resolve(undefined),
                Math.min(limit, 150),
              );
            })
              .then(() => fake.visitorApi.send(request))
              .then((answer) => answer.data)
          : undefined,
      { requestTimeoutMs: 20, orderTimeoutMs: 1000 },
    );
    const session = await guestWithCola(shopware);
    const order = await shopware.checkout.placeOrder(session, {
      wishedTime: WISHED,
      fulfillment: "delivery",
      note: null,
    });
    expect(order.number).toMatch(/\S/);
    const request = sent.find((entry) => entry.path === "/checkout/order");
    expect(request?.timeoutMs).toBe(1000);
    // other requests keep theirs
    expect(
      sent.find((entry) => entry.path === "/account/register")?.timeoutMs,
    ).toBe(20);
  });

  it("lists the payment methods when only the shop's default cannot be read", async () => {
    const { shopware } = backend(
      (request) =>
        request.path === "/context"
          ? Promise.reject(httpError(503, "FRAMEWORK__INTERNAL"))
          : undefined,
      {},
      {
        get: (path) =>
          path === "/context" ? Promise.reject(httpError(503, "X")) : undefined,
      },
    );
    const methods = await shopware.checkout.listPaymentMethods(
      testSession("some-token"),
    );
    expect(methods.map((method) => [method.name, method.preferred])).toEqual([
      ["Barzahlung", false],
      ["Kartenzahlung", false],
    ]);
  });

  it("takes Shopware's 401 like its 403", async () => {
    const { shopware } = backend((request) =>
      request.path === "/order"
        ? Promise.reject(httpError(401, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN"))
        : undefined,
    );
    const session = testSession("some-token");
    expect(
      isDomainError(
        await rejection(() =>
          shopware.orders.getOrder(session, "0123456789abcdef0123456789abcdef"),
        ),
        "not_found",
      ),
    ).toBe(true);
    expect(
      isDomainError(
        await rejection(() => shopware.orders.listOrders(session)),
        "unauthenticated",
      ),
    ).toBe(true);
  });

  it("reads the sales channel's domains once for several guests", async () => {
    let contexts = 0;
    const { shopware } = backend(
      undefined,
      {},
      {
        get: (path) => {
          if (path === "/context") contexts++;
          return undefined;
        },
      },
    );
    await shopware.checkout.registerGuest(testSession(), GUEST, STOREFRONT_URL);
    await shopware.checkout.registerGuest(testSession(), GUEST, STOREFRONT_URL);
    expect(contexts).toBe(1);
  });
});

describe("the wished time in the customer comment", () => {
  const berlin = timeZone("Europe/Berlin");

  it("writes the fulfillment's word and the time, then the note", () => {
    expect(
      orderComment({ wishedTime: WISHED, fulfillment: "delivery", note: null }),
    ).toBe("Wunschlieferzeit: 18:40");
    expect(
      orderComment({
        wishedTime: WISHED,
        fulfillment: "pickup",
        note: "Bitte klingeln",
      }),
    ).toBe("Wunschabholzeit: 18:40\nBitte klingeln");
  });

  it("reads every word the storefront ever wrote", () => {
    for (const word of ["Wunschlieferzeit", "Wunschabholzeit", "Wunschzeit"]) {
      expect(
        readComment(`${word}: 18:40`, "2026-11-21T16:00:00Z", berlin),
      ).toEqual({ wishedTime: wishedTime("2026-11-21", "18:40"), note: null });
    }
  });

  it("dates a time after midnight to the next day", () => {
    expect(
      readComment("Wunschlieferzeit: 00:20", "2026-11-21T22:50:00Z", berlin),
    ).toEqual({ wishedTime: wishedTime("2026-11-22", "00:20"), note: null });
  });

  it("keeps any other comment as the note", () => {
    expect(
      readComment("Bitte klingeln", "2026-11-21T16:00:00Z", berlin),
    ).toEqual({
      wishedTime: null,
      note: "Bitte klingeln",
    });
    expect(readComment(null, "2026-11-21T16:00:00Z", berlin)).toEqual({
      wishedTime: null,
      note: null,
    });
    expect(
      readComment("Wunschlieferzeit: 18:42", "2026-11-21T16:00:00Z", berlin),
    ).toEqual({ wishedTime: null, note: "Wunschlieferzeit: 18:42" });
  });
});
