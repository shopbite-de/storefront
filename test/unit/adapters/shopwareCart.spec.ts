import { inspect } from "node:util";
import { v5 as uuidv5 } from "uuid";
import { describe, expect, it, vi } from "vitest";
import {
  containerLineId,
  createShopwareCart,
  toCart,
  type SwCart,
} from "../../../server/adapters/shopware/cart";
import type { VisitorStoreApi } from "../../../server/adapters/shopware";
import { dishConfiguration, isDomainError } from "../../../shared/domain";
import {
  BASIL,
  CHEESE,
  COLA,
  MARGHERITA,
  OLIVES,
  PIZZERIA,
  TOMATO,
  testSession,
} from "../../contract/cart.contract";
import { fakeShopwareCart, httpError } from "../../contract/cartFixtures";

/**
 * Shopware-only details of the cart: the line items the ShopBite plugin
 * expects, exactly as the storefront sent them up to 2.6.1 (so lines in
 * existing carts keep merging), the context token in the session, cart
 * locks, and the cart errors as domain messages.
 */
function cartOf(fake = fakeShopwareCart(PIZZERIA), options = {}) {
  return {
    fake,
    cart: createShopwareCart(fake.storeApi, fake.visitorApi, {
      currency: async () => "EUR",
      log: () => {},
      lockRetryDelayMs: 0,
      ...options,
    }),
  };
}

/** The container id of storefront 2.6.1 (`useAddToCart`), verbatim. */
function legacyContainerId(
  baseId: string,
  extras: string[],
  without: string[],
) {
  const extrasSeed = extras.sort().join("");
  const withoutSeed = [
    ...new Set(without.map((name) => name.toLocaleLowerCase("de"))),
  ]
    .sort()
    .join("|");
  const seed = withoutSeed
    ? `${baseId}${extrasSeed}|without:${withoutSeed}`
    : `${baseId}${extrasSeed}`;
  return uuidv5(seed, "b098ef7e-0fa2-4073-b002-7ceec4360fbf");
}

describe("Shopware cart: container line ids", () => {
  it("are the ids of storefront 2.6.1", () => {
    // as stored by a quickstart cart: Pizza Margherita (Normal) + Extra Käse, ohne Käse
    expect(
      containerLineId(
        "673c5a02ff145b92a607f8e26725672a",
        ["1f536280bb555c4d9f9be1f594065b24"],
        ["Käse"],
      ),
    ).toBe("924a0816-412c-550f-8096-ae9bd8024fb7");
    for (const [extras, without] of [
      [[OLIVES, CHEESE], []],
      [[CHEESE], ["Basilikum", "Tomaten"]],
      [[], ["Tomaten"]],
      [[], ["ÄPFEL", "Zwiebeln", "zwiebeln"]],
    ] as [string[], string[]][]) {
      expect(containerLineId(MARGHERITA, extras, without)).toBe(
        legacyContainerId(MARGHERITA, [...extras], [...without]),
      );
    }
  });
});

describe("Shopware cart: requests", () => {
  it("adds a plain dish as a product line item, without a product lookup", async () => {
    const { cart, fake } = cartOf();
    await cart.addLine(testSession(), dishConfiguration({ dishId: COLA }), 2);

    expect(fake.requests).toEqual([
      {
        method: "POST",
        path: "/checkout/cart/line-item",
        body: { items: [{ id: COLA, quantity: 2, type: "product" }] },
      },
    ]);
  });

  it("adds a configured dish as the plugin's container line item", async () => {
    const { cart, fake } = cartOf();
    await cart.addLine(
      testSession(),
      dishConfiguration({
        dishId: MARGHERITA,
        extraIds: [OLIVES, CHEESE],
        removedIngredientIds: [BASIL, TOMATO],
      }),
      2,
    );

    const lookup = fake.requests.find(
      (request) => request.path === "/product",
    )!;
    expect(lookup.body?.ids).toEqual([MARGHERITA, OLIVES, CHEESE]);

    const add = fake.requests.find(
      (request) => request.path === "/checkout/cart/line-item",
    )!;
    expect(add.path).toBe("/checkout/cart/line-item");
    const [item] = add.body!.items as Record<string, unknown>[];
    expect(item).toEqual({
      id: legacyContainerId(
        MARGHERITA,
        [OLIVES, CHEESE],
        ["Basilikum", "Tomaten"],
      ),
      quantity: 2,
      type: "container",
      label: "Pizza Margherita +Oliven +Extra Käse -Basilikum -Tomaten",
      payload: { productNumber: "21", without: ["Basilikum", "Tomaten"] },
      children: [
        {
          id: expect.stringMatching(/^[0-9a-f]{32}$/),
          quantity: 2,
          type: "product",
          referencedId: MARGHERITA,
        },
        { id: OLIVES, quantity: 2, type: "product" },
        { id: CHEESE, quantity: 2, type: "product" },
      ],
    });
  });

  it("removes a line with quantity 0 instead of sending it", async () => {
    const { cart, fake } = cartOf();
    const session = testSession();
    const added = await cart.addLine(
      session,
      dishConfiguration({ dishId: COLA }),
      1,
    );
    await cart.changeQuantity(session, added.lines[0]!.id, 0);

    expect(fake.requests.at(-1)).toMatchObject({
      method: "POST",
      path: "/checkout/cart/line-item/delete",
      body: { ids: [COLA] },
    });
  });

  it("sends a voucher as a promotion line item and removes it by its line", async () => {
    const { cart, fake } = cartOf();
    const session = testSession();
    await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);
    await cart.applyVoucher(session, " WILLKOMMEN ");
    expect(fake.requests.at(-1)?.body).toEqual({
      items: [{ referencedId: "WILLKOMMEN", type: "promotion" }],
    });

    await cart.removeVoucher(session, "WILLKOMMEN");
    expect(fake.requests.at(-1)).toMatchObject({
      path: "/checkout/cart/line-item/delete",
      body: { ids: ["promotion-WILLKOMMEN"] },
    });
  });
});

describe("Shopware cart: visitor and backend load", () => {
  it("forwards the visitor's address chain for Shopware's rate limits", async () => {
    const { cart, fake } = cartOf();
    const session = { ...testSession(), forwardedFor: "203.0.113.7, 10.0.0.5" };
    await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);

    expect(fake.requests[0]).toMatchObject({
      path: "/checkout/cart/line-item",
      forwardedFor: "203.0.113.7, 10.0.0.5",
    });
  });

  it("answers an empty cart to a visitor without state without asking Shopware", async () => {
    const { cart, fake } = cartOf();
    const session = testSession();

    const empty = await cart.getCart(session);

    expect(empty.lines).toEqual([]);
    expect(empty.total).toEqual({ amountMinor: 0, currency: "EUR" });
    expect(fake.requests).toEqual([]);
    expect(session.state()).toBeUndefined();
  });

  it("looks a dish up once for a while, not for every answer", async () => {
    const { cart, fake } = cartOf();
    const session = testSession();
    const configuration = dishConfiguration({
      dishId: MARGHERITA,
      extraIds: [CHEESE],
      removedIngredientIds: [BASIL],
    });
    await cart.addLine(session, configuration, 1);
    await cart.addLine(session, configuration, 1);
    await cart.getCart(session);
    await cart.getCart(session);

    const lookups = fake.requests.filter((request) =>
      request.path.startsWith("/product"),
    );
    // the dish with its extra, and the dish's extras: once each
    expect(lookups.map((request) => request.path)).toEqual([
      "/product",
      `/product/${MARGHERITA}/cross-selling`,
    ]);
  });
});

describe("Shopware cart: no token in texts", () => {
  const token = "PhqKLd6O3YbAz2CVYjRcTi0Ru2uQMwuw";

  it("removes the token from the backend's message texts", () => {
    const cart = toCart(
      {
        token,
        errors: [
          {
            messageKey: "promotion-not-found",
            level: 20,
            translatedMessage: `Gutschein für ${token} existiert nicht.`,
            promotionCode: token,
          },
        ],
      },
      "EUR",
    );
    expect(JSON.stringify(cart)).not.toContain(token);
    expect(cart.messages[0]!.text).toBe("Gutschein für *** existiert nicht.");
  });

  it("keeps Shopware's error texts (with the token) out of the error it throws", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const send = vi.fn<VisitorStoreApi["send"]>();
    send.mockRejectedValue(
      Object.assign(httpError(409, "CHECKOUT__CART_LOCKED"), {
        message: `[POST] "http://shopware:8000/store-api/checkout/cart/line-item": 409 Cart with token ${token} is locked`,
        data: {
          errors: [
            {
              code: "CHECKOUT__CART_LOCKED",
              detail: `Cart with token ${token} is locked due to concurrent write operation`,
            },
          ],
        },
      }),
    );
    const { cart } = cartOf({
      ...fake,
      visitorApi: { send: send as VisitorStoreApi["send"] },
    });

    const error = await cart
      .addLine(testSession(token), dishConfiguration({ dishId: COLA }), 1)
      .catch((caught: unknown) => caught);

    expect(isDomainError(error, "backend_unavailable")).toBe(true);
    const logged = inspect(error, { depth: 10 });
    expect(logged).not.toContain(token);
    expect(logged).not.toContain("shopware:8000");
    expect(logged).toContain("CHECKOUT__CART_LOCKED");
  });
});

describe("Shopware cart: a Shopware that does not answer", () => {
  const never = () => new Promise<never>(() => {});
  const configured = dishConfiguration({
    dishId: MARGHERITA,
    extraIds: [CHEESE],
  });

  async function expectUnavailableSoon(call: () => Promise<unknown>) {
    const started = Date.now();
    const error = await call().catch((caught: unknown) => caught);
    expect(isDomainError(error, "backend_unavailable")).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  }

  it("gives up on the product lookup", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    fake.storeApi.post = never;
    const { cart } = cartOf(fake, { requestTimeoutMs: 30 });
    await expectUnavailableSoon(() =>
      cart.addLine(testSession(), configured, 1),
    );
  });

  it("gives up on the extras of the dish", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const post = fake.storeApi.post;
    fake.storeApi.post = (async (path: string, ...rest: unknown[]) =>
      path.endsWith("/cross-selling")
        ? never()
        : (post as (...args: unknown[]) => Promise<unknown>)(
            path,
            ...rest,
          )) as typeof post;
    const { cart } = cartOf(fake, { requestTimeoutMs: 30 });
    await expectUnavailableSoon(() =>
      cart.addLine(testSession(), configured, 1),
    );
  });

  it("gives up on the currency", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const { cart } = cartOf(fake, { requestTimeoutMs: 30, currency: never });
    await expectUnavailableSoon(() => cart.getCart(testSession("t")));
  });

  it("gives up on the cart itself", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const { cart } = cartOf(
      { ...fake, visitorApi: { send: never as VisitorStoreApi["send"] } },
      { requestTimeoutMs: 30 },
    );
    await expectUnavailableSoon(() =>
      cart.addLine(testSession("t"), dishConfiguration({ dishId: COLA }), 1),
    );
  });
});

describe("Shopware cart: context token", () => {
  it("asks without a token for a new visitor and keeps the one Shopware issues", async () => {
    const { cart, fake } = cartOf();
    const session = testSession();
    await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);

    expect(fake.requests[0]!.contextToken).toBeUndefined();
    expect(session.state()).toBe("context-1");

    await cart.getCart(session);
    expect(fake.requests[1]!.contextToken).toBe("context-1");
  });

  it("writes a token only when Shopware answers another one", async () => {
    const send = vi.fn<VisitorStoreApi["send"]>(async () => ({
      data: {} as never,
      contextToken: "token-1",
    }));
    const fake = fakeShopwareCart(PIZZERIA);
    const { cart } = cartOf({
      ...fake,
      visitorApi: { send: send as VisitorStoreApi["send"] },
    });
    const session = testSession("token-1");
    const write = vi.spyOn(session, "write");

    await cart.getCart(session);
    expect(write).not.toHaveBeenCalled();

    send.mockResolvedValueOnce({ data: {} as never, contextToken: "token-2" });
    await cart.getCart(session);
    expect(write).toHaveBeenCalledWith("token-2");
  });

  it("never answers the token in the cart", async () => {
    const { cart } = cartOf();
    const answer = await cart.addLine(
      testSession(),
      dishConfiguration({ dishId: COLA }),
      1,
    );
    expect(JSON.stringify(answer)).not.toMatch(/context-1|the-context-token/);
  });
});

describe("Shopware cart: failures", () => {
  it("sends a write again once when the cart is locked by a parallel write", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const send = vi.fn(fake.visitorApi.send);
    send.mockRejectedValueOnce(httpError(409, "CHECKOUT__CART_LOCKED"));
    const { cart } = cartOf({
      ...fake,
      visitorApi: { send: send as VisitorStoreApi["send"] },
    });

    const answer = await cart.addLine(
      testSession(),
      dishConfiguration({ dishId: COLA }),
      1,
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(answer.lines).toHaveLength(1);
  });

  it("answers an outage as backend_unavailable and Shopware's 400 as invalid_value", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const send = vi.fn<VisitorStoreApi["send"]>();
    const { cart } = cartOf({
      ...fake,
      visitorApi: { send: send as VisitorStoreApi["send"] },
    });

    send.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(cart.getCart(testSession("t"))).rejects.toSatisfy((error) =>
      isDomainError(error, "backend_unavailable"),
    );
    send.mockRejectedValueOnce(httpError(500, "FRAMEWORK__INTERNAL"));
    await expect(cart.getCart(testSession("t"))).rejects.toSatisfy((error) =>
      isDomainError(error, "backend_unavailable"),
    );
    send.mockRejectedValueOnce(
      httpError(400, "CHECKOUT__CART_INVALID_LINE_ITEM_QUANTITY"),
    );
    await expect(
      cart.changeQuantity(testSession("t"), COLA, 2),
    ).rejects.toSatisfy((error) => isDomainError(error, "invalid_value"));
  });

  it("keeps the removed ingredients' names when their ids cannot be looked up", async () => {
    const fake = fakeShopwareCart(PIZZERIA);
    const log = vi.fn();
    // nothing kept, so the answer looks the dish up again
    const { cart } = cartOf(fake, { log, lookupTtlMs: -1 });
    const session = testSession();
    await cart.addLine(
      session,
      dishConfiguration({ dishId: MARGHERITA, removedIngredientIds: [BASIL] }),
      1,
    );
    fake.storeApi.post = async () => {
      throw new Error("down");
    };

    const answer = await cart.getCart(session);

    expect(answer.lines[0]!.removedIngredients).toEqual(["Basilikum"]);
    expect(answer.lines[0]!.configuration.removedIngredientIds).toEqual([]);
    expect(log).toHaveBeenCalled();
  });
});

/** A trimmed cart as the quickstart's Shopware answers it. */
const STORE_API_CART: SwCart = {
  lineItems: [
    {
      id: "924a0816-412c-550f-8096-ae9bd8024fb7",
      type: "container",
      referencedId: "673c5a02ff145b92a607f8e26725672a",
      label: "Pizza Margherita +Extra Käse -Käse",
      quantity: 2,
      payload: { productNumber: "SB-21-normal", without: ["Käse"] },
      price: { unitPrice: 8, totalPrice: 16 },
      children: [
        {
          id: "58cd0b3a8b2a4e0a9c6f3a2e1d0c9b8a",
          type: "product",
          referencedId: "673c5a02ff145b92a607f8e26725672a",
          label: "Pizza Margherita",
          quantity: 2,
          payload: {
            productNumber: "SB-21-normal",
            parentId: "ae0946785b4a53438dac2b8535eb4f9f",
            options: [{ group: "Größe", option: "Normal 30 cm" }],
          },
          price: { unitPrice: 7, totalPrice: 14 },
          cover: {
            url: "http://localhost:8000/media/margherita.webp",
            metaData: { width: 1200, height: 900 },
            thumbnails: [],
          },
        },
        {
          id: "1f536280bb555c4d9f9be1f594065b24",
          type: "product",
          referencedId: "1f536280bb555c4d9f9be1f594065b24",
          label: "Extra Käse",
          quantity: 2,
          price: { unitPrice: 1, totalPrice: 2 },
        },
      ],
    },
    {
      id: "promo-line",
      type: "promotion",
      referencedId: null,
      label: "Mittagsrabatt",
      quantity: 1,
      payload: { code: "" },
      price: { unitPrice: -1.5, totalPrice: -1.5 },
    },
  ],
  price: {
    positionPrice: 14.5,
    totalPrice: 17,
    calculatedTaxes: [{ tax: 1.11, taxRate: 7 }],
  },
  deliveries: [
    {
      shippingCosts: { totalPrice: 2.5 },
      shippingMethod: { id: "delivery-id" },
    },
  ],
  transactions: [{ paymentMethodId: "cash-id" }],
  errors: {
    "shipping-method-blocked-Lieferung": {
      key: "shipping-method-blocked-Lieferung",
      messageKey: "shipping-method-blocked",
      level: 10,
      message: "Shipping method Lieferung not available",
      parameters: { name: "Lieferung" },
    },
    "shopbite-ordering-closed": {
      key: "shopbite-ordering-closed",
      messageKey: "shopbite-ordering-closed",
      level: 20,
      message: "Closed",
    },
    "promotion-discount-added-x": {
      messageKey: "promotion-discount-added",
      level: 0,
      message: "Discount added",
      promotionCode: "X",
    },
  },
};

describe("Shopware cart: answer", () => {
  it("reads a container line, an automatic discount, costs, taxes and methods", () => {
    const cart = toCart(
      STORE_API_CART,
      "EUR",
      new Map([
        [
          "673c5a02ff145b92a607f8e26725672a",
          new Map([["Käse", "c395ed526247519993f652f2df255eb2"]]),
        ],
      ]),
    );

    expect(cart.lines).toEqual([
      {
        id: "924a0816-412c-550f-8096-ae9bd8024fb7",
        configuration: {
          dishId: "ae0946785b4a53438dac2b8535eb4f9f",
          variantId: "673c5a02ff145b92a607f8e26725672a",
          extraIds: ["1f536280bb555c4d9f9be1f594065b24"],
          removedIngredientIds: ["c395ed526247519993f652f2df255eb2"],
        },
        dishNumber: "SB-21-normal",
        name: "Pizza Margherita",
        variant: [{ group: "Größe", option: "Normal 30 cm" }],
        extras: [
          {
            id: "1f536280bb555c4d9f9be1f594065b24",
            name: "Extra Käse",
            unitPrice: { amountMinor: 100, currency: "EUR" },
          },
        ],
        removedIngredients: ["Käse"],
        quantity: 2,
        unitPrice: { amountMinor: 800, currency: "EUR" },
        totalPrice: { amountMinor: 1600, currency: "EUR" },
        media: {
          url: "http://localhost:8000/media/margherita.webp",
          alt: null,
          width: 1200,
          height: 900,
          sources: [],
        },
      },
    ]);
    expect(cart.discounts).toEqual([
      {
        code: null,
        name: "Mittagsrabatt",
        amount: { amountMinor: -150, currency: "EUR" },
      },
    ]);
    expect(cart.subtotal.amountMinor).toBe(1450);
    expect(cart.shippingCosts.amountMinor).toBe(250);
    expect(cart.total.amountMinor).toBe(1700);
    expect(cart.taxes).toEqual([
      { rate: 7, amount: { amountMinor: 111, currency: "EUR" } },
    ]);
    expect(cart.shippingMethodId).toBe("delivery-id");
    expect(cart.paymentMethodId).toBe("cash-id");
    expect(cart.messages).toEqual([
      {
        code: "shipping_method_blocked",
        severity: "warning",
        text: "Shipping method Lieferung not available",
        subjectId: null,
      },
      {
        code: "ordering_closed",
        severity: "error",
        text: "Closed",
        subjectId: null,
      },
      {
        code: "other",
        severity: "info",
        text: "Discount added",
        subjectId: "X",
      },
    ]);
  });

  it("maps the backend's cart errors to message codes", () => {
    const codes = (messageKey: string, level = 20) =>
      toCart({ errors: [{ messageKey, level }] }, "EUR").messages[0]?.code;
    expect(codes("product-not-found")).toBe("dish_unavailable");
    expect(codes("product-out-of-stock")).toBe("dish_unavailable");
    expect(codes("product-stock-reached", 10)).toBe("quantity_adjusted");
    expect(codes("min-order-quantity", 10)).toBe("quantity_adjusted");
    expect(codes("payment-method-blocked", 10)).toBe("payment_method_blocked");
    expect(codes("promotion-not-found")).toBe("voucher_invalid");
    expect(codes("promotion-not-eligible", 10)).toBe("voucher_invalid");
    expect(codes("shopbite-ordering-paused")).toBe("ordering_closed");
    expect(codes("shopbite-ordering-holiday")).toBe("ordering_closed");
    expect(codes("something-new")).toBe("other");
  });

  it("is an empty cart in the sales channel's currency for an empty answer", () => {
    const cart = toCart({}, "EUR");
    expect(cart.lines).toEqual([]);
    expect(cart.total).toEqual({ amountMinor: 0, currency: "EUR" });
    expect(cart.shippingMethodId).toBeNull();
  });
});
