import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../../server/ports";
import { demoSeed } from "../../server/adapters/memory";
import { CACHE_TTL, stubNitro } from "./nitroStubs";

/**
 * The checkout behind the BFF (ADR 0001, step 5) on the memory adapter:
 * domain answers, private, CSRF on writes, the order placed once per
 * attempt, no order of another visitor readable.
 */
type Cookie = { name: string; value: string };

function browser() {
  return { cookies: new Map<string, string>() };
}
type Client = ReturnType<typeof browser>;

type Request = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

function eventOf(client: Client, request: Request) {
  return {
    method: request.method,
    params: request.params ?? {},
    body: request.body,
    context: {} as Record<string, unknown>,
    headers: {
      host: "localhost:3000",
      ...(request.method === "GET" ? {} : { origin: "http://localhost:3000" }),
      ...request.headers,
    } as Record<string, string>,
    node: { req: { socket: { remoteAddress: "10.0.0.5" } } },
    client,
    setCookies: [] as Cookie[],
    responseHeaders: {} as Record<string, string>,
  };
}
type TestEvent = ReturnType<typeof eventOf>;

const ROUTES: Record<string, string> = {
  "POST /api/cart/lines": "../../server/api/cart/lines.post",
  "POST /api/session": "../../server/api/session.post",
  "GET /api/checkout/selection": "../../server/api/checkout/selection.get",
  "POST /api/checkout/selection": "../../server/api/checkout/selection.post",
  "GET /api/checkout/payment-methods":
    "../../server/api/checkout/payment-methods.get",
  "GET /api/checkout/orderer": "../../server/api/checkout/orderer.get",
  "POST /api/checkout/guest": "../../server/api/checkout/guest.post",
  "PATCH /api/checkout/orderer/addresses/[addressId]":
    "../../server/api/checkout/orderer/addresses/[addressId].patch",
  "POST /api/checkout/orders": "../../server/api/checkout/orders.post",
  "GET /api/orders/[orderId]": "../../server/api/orders/[orderId].get",
  "POST /api/orders/[orderId]/payment":
    "../../server/api/orders/[orderId]/payment.post",
};

let backend: Backend;

async function setup(given?: Backend) {
  const memory = await import("../../server/adapters/memory");
  backend = given ?? memory.createMemoryBackend();
  const { answerDomain, toHttpError } =
    await import("../../server/utils/domainHttp");
  const session = await import("../../server/utils/visitorSession");
  const cartRoutes = await import("../../server/utils/cartRoutes");
  const checkoutRoutes = await import("../../server/utils/checkoutRoutes");
  stubNitro({
    answerDomain,
    toHttpError,
    ...session,
    ...cartRoutes,
    ...checkoutRoutes,
    useBackend: () => backend,
    useRuntimeConfig: () => ({
      public: {
        storeUrl: "http://localhost:3000",
        shopBite: { cacheTtl: CACHE_TTL, menuCategoryId: "" },
        shopware: { endpoint: "http://shopware/store-api", accessToken: "k" },
      },
      visitorSession: {
        maxAgeDays: 30,
        password: "route-test-session-password-0123456789",
        previousPasswords: "",
      },
    }),
    getCookie: (event: TestEvent, name: string) =>
      event.client.cookies.get(name),
    setCookie: (event: TestEvent, name: string, value: string) => {
      event.setCookies.push({ name, value });
      event.client.cookies.set(name, value);
    },
    deleteCookie: (event: TestEvent, name: string) => {
      event.client.cookies.delete(name);
    },
    getRequestHeader: (event: TestEvent, name: string) => event.headers[name],
    setResponseHeader: (event: TestEvent, name: string, value: string) => {
      event.responseHeaders[name] = value;
    },
    readBody: async (event: TestEvent) => event.body,
    getRouterParam: (event: TestEvent, name: string) => event.params[name],
    setResponseStatus: () => {},
  });
}

async function send(client: Client, request: Request) {
  const key = `${request.method} ${request.path}`;
  const handler = (await import(/* @vite-ignore */ ROUTES[key]!)).default as (
    event: TestEvent,
  ) => Promise<unknown>;
  const event = eventOf(client, request);
  try {
    return { event, body: await handler(event), error: undefined };
  } catch (error) {
    return {
      event,
      body: undefined,
      error: error as {
        statusCode: number;
        data?: { code?: string; details?: Record<string, unknown> };
      },
    };
  }
}

/** A dish of the demo menu without variants. */
const COLA = demoSeed().catalog.dishes.find(
  (dish) => dish.variants.length === 0 && dish.available,
)!.id;

const GUEST = {
  email: "max@example.com",
  firstName: "Max",
  lastName: "Muster",
  business: false,
  billingAddress: {
    street: "Musterstraße 1",
    postalCode: "12345",
    city: "Musterstadt",
    country: "DE",
    phone: "0123456789",
  },
};

/** 17:00 in Berlin; the demo restaurant is open 00:00–23:59. */
const NOW = new Date("2026-11-21T16:00:00Z");
const WISHED = { date: "2026-11-21", time: "17:30" };

async function guestWithCola(client: Client = browser()) {
  await send(client, {
    method: "POST",
    path: "/api/cart/lines",
    body: { dishId: COLA, quantity: 2 },
  });
  const guest = await send(client, {
    method: "POST",
    path: "/api/checkout/guest",
    body: GUEST,
  });
  expect(guest.error).toBeUndefined();
  return client;
}

const order = (client: Client, body: Record<string, unknown> = {}) =>
  send(client, {
    method: "POST",
    path: "/api/checkout/orders",
    body: { attemptId: "attempt-0001", wishedTime: WISHED, ...body },
  });

type Placed = {
  order: { id: string; number: string; fulfillment: string; lines: unknown[] };
  redirectUrl: string | null;
  paymentFailed: boolean;
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the guest checkout", () => {
  it("selects methods, takes the guest's details and places the order", async () => {
    await setup();
    const client = browser();
    const selection = await send(client, {
      method: "GET",
      path: "/api/checkout/selection",
    });
    expect(selection.body).toEqual({
      shippingMethodId: "delivery",
      paymentMethodId: "cash",
    });
    // a read gives a new visitor no session
    expect(selection.event.setCookies).toEqual([]);
    expect(selection.event.responseHeaders["cache-control"]).toBe(
      "private, no-store",
    );

    await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 2 },
    });
    const pickup = await send(client, {
      method: "POST",
      path: "/api/checkout/selection",
      body: { shippingMethodId: "pickup" },
    });
    expect(pickup.body).toEqual({
      shippingMethodId: "pickup",
      paymentMethodId: "cash",
    });
    const methods = await send(client, {
      method: "GET",
      path: "/api/checkout/payment-methods",
    });
    expect(
      (methods.body as { id: string; preferred: boolean }[]).map((m) => [
        m.id,
        m.preferred,
      ]),
    ).toEqual([
      ["cash", true],
      ["card", false],
    ]);

    const none = await send(client, {
      method: "GET",
      path: "/api/checkout/orderer",
    });
    expect(none.body).toEqual({ orderer: null });
    const guest = await send(client, {
      method: "POST",
      path: "/api/checkout/guest",
      body: GUEST,
    });
    expect(guest.body).toMatchObject({
      customer: { guest: true, email: "max@example.com" },
      billingAddress: { firstName: "Max", street: "Musterstraße 1" },
    });

    const placed = await order(client, {
      wishedTime: { date: "2026-11-21", time: "17:15" },
    });
    expect(placed.error).toBeUndefined();
    expect(placed.event.responseHeaders["cache-control"]).toBe(
      "private, no-store",
    );
    const answer = placed.body as Placed;
    expect(answer.order.fulfillment).toBe("pickup");
    expect(answer.order.lines).toHaveLength(1);
    expect(answer.redirectUrl).toBeNull();
    expect(answer.paymentFailed).toBe(false);

    const read = await send(client, {
      method: "GET",
      path: "/api/orders/[orderId]",
      params: { orderId: answer.order.id },
    });
    expect(read.body).toEqual(answer.order);
  });

  it("changes an address of the guest", async () => {
    await setup();
    const client = await guestWithCola();
    const orderer = (
      (await send(client, { method: "GET", path: "/api/checkout/orderer" }))
        .body as { orderer: { billingAddress: { id: string } } }
    ).orderer;
    const changed = await send(client, {
      method: "PATCH",
      path: "/api/checkout/orderer/addresses/[addressId]",
      params: { addressId: orderer.billingAddress.id },
      body: {
        ...GUEST.billingAddress,
        firstName: "Max",
        lastName: "Muster",
        street: "Neue Straße 5",
      },
    });
    expect(changed.body).toMatchObject({
      billingAddress: { street: "Neue Straße 5" },
    });
  });
});

describe("POST /api/session", () => {
  it("starts the session of a new visitor once, before the first write", async () => {
    await setup();
    const client = browser();
    const first = await send(client, { method: "POST", path: "/api/session" });
    expect(first.error).toBeUndefined();
    expect(first.event.setCookies.map((cookie) => cookie.name)).toEqual([
      "shopbite-session",
    ]);
    // the cart write then lands in that session, no second one starts
    const added = await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 1 },
    });
    expect(added.error).toBeUndefined();
    const again = await send(client, { method: "POST", path: "/api/session" });
    expect(again.event.setCookies).toEqual([]);
  });

  it("refuses another site", async () => {
    await setup();
    const { error } = await send(browser(), {
      method: "POST",
      path: "/api/session",
      headers: { origin: "https://evil.example" },
    });
    expect(error?.statusCode).toBe(403);
  });
});

describe("placing an order once", () => {
  it("answers a double click with one order", async () => {
    await setup();
    const client = await guestWithCola();
    const [first, second] = await Promise.all([order(client), order(client)]);
    expect(first.error).toBeUndefined();
    expect(second.error).toBeUndefined();
    expect((second.body as Placed).order.id).toBe(
      (first.body as Placed).order.id,
    );
    const orders = await send(client, {
      method: "GET",
      path: "/api/orders/[orderId]",
      params: { orderId: (first.body as Placed).order.id },
    });
    expect(orders.error).toBeUndefined();
  });

  it("answers a retry of the same attempt with the same order", async () => {
    await setup();
    const client = await guestWithCola();
    const first = (await order(client)).body as Placed;
    const retry = (await order(client)).body as Placed;
    expect(retry.order.number).toBe(first.order.number);
  });

  it("answers a new attempt with an empty cart with the order already placed", async () => {
    await setup();
    const client = await guestWithCola();
    await order(client);
    // the order button of a second tab with the old page
    const { error } = await order(client, { attemptId: "attempt-0002" });
    expect(error?.statusCode).toBe(409);
    expect(error?.data?.code).toBe("order_already_placed");
    expect(error?.data?.details).toEqual({ orderId: expect.any(String) });
  });

  it("takes a guest without a country (the shop's own)", async () => {
    await setup();
    const client = browser();
    const { body, error } = await send(client, {
      method: "POST",
      path: "/api/checkout/guest",
      body: {
        ...GUEST,
        billingAddress: { ...GUEST.billingAddress, country: null },
      },
    });
    expect(error).toBeUndefined();
    expect(body).toMatchObject({ billingAddress: { country: "DE" } });
  });

  it("refuses an order without a session or cart", async () => {
    await setup();
    const { error } = await order(browser());
    expect(error?.statusCode).toBe(409);
    expect(error?.data?.code).toBe("cart_empty");
  });
});

describe("security of the checkout routes", () => {
  it("refuses writes another site makes the browser send", async () => {
    await setup();
    const client = await guestWithCola();
    for (const request of [
      {
        method: "POST",
        path: "/api/checkout/orders",
        body: { attemptId: "attempt-0001", wishedTime: WISHED },
      },
      { method: "POST", path: "/api/checkout/guest", body: GUEST },
      {
        method: "POST",
        path: "/api/checkout/selection",
        body: { shippingMethodId: "pickup" },
      },
    ]) {
      const { error } = await send(client, {
        ...request,
        headers: { origin: "https://evil.example" },
      });
      expect([request.path, error?.statusCode, error?.data?.code]).toEqual([
        request.path,
        403,
        "cross_site_request",
      ]);
    }
  });

  it("never shows another visitor's order, nor one by a guessed id", async () => {
    await setup();
    const client = await guestWithCola();
    const placed = (await order(client)).body as Placed;
    for (const stranger of [browser(), await guestWithCola(browser())]) {
      const { error } = await send(stranger, {
        method: "GET",
        path: "/api/orders/[orderId]",
        params: { orderId: placed.order.id },
      });
      expect(error?.statusCode).toBe(404);
    }
    for (const orderId of [
      placed.order.number,
      "../../order",
      "x".repeat(70),
    ]) {
      const { error } = await send(client, {
        method: "GET",
        path: "/api/orders/[orderId]",
        params: { orderId },
      });
      expect([404, 400]).toContain(error?.statusCode);
    }
  });

  it("validates the guest's details", async () => {
    await setup();
    const cases: [Record<string, unknown>, string][] = [
      [{ ...GUEST, email: "no-mail" }, "email"],
      [{ ...GUEST, email: `${"a".repeat(250)}@example.com` }, "email"],
      [{ ...GUEST, firstName: " " }, "firstName"],
      [
        { ...GUEST, billingAddress: { ...GUEST.billingAddress, phone: "123" } },
        "billingAddress.phone",
      ],
      [
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, phone: undefined },
        },
        "billingAddress.phone",
      ],
      [
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, street: "x".repeat(256) },
        },
        "billingAddress.street",
      ],
      [
        {
          ...GUEST,
          billingAddress: {
            ...GUEST.billingAddress,
            city: "Muster\u0000stadt",
          },
        },
        "billingAddress.city",
      ],
      [
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, country: "Deutschland" },
        },
        "billingAddress.country",
      ],
      [{ ...GUEST, business: true }, "billingAddress.company"],
      [
        {
          ...GUEST,
          deliveryAddress: {
            street: "Nebenweg 2",
            city: "Musterstadt",
            country: "DE",
          },
        },
        "deliveryAddress.firstName",
      ],
    ];
    for (const [body, field] of cases) {
      const { error } = await send(browser(), {
        method: "POST",
        path: "/api/checkout/guest",
        body,
      });
      expect([field, error?.statusCode, error?.data?.details?.field]).toEqual([
        field,
        400,
        field,
      ]);
    }
  });

  it("validates the order's attempt, wished time and note", async () => {
    await setup();
    const client = await guestWithCola();
    const cases: [Record<string, unknown>, number, string][] = [
      [{ attemptId: "x" }, 400, "invalid_value"],
      [
        { wishedTime: { date: "2026-11-21", time: "17:32" } },
        400,
        "invalid_value",
      ],
      [{ wishedTime: "17:30" }, 400, "invalid_value"],
      [{ note: "x".repeat(501) }, 400, "invalid_value"],
      // before now plus the lead time, after closing, another day
      [
        { wishedTime: { date: "2026-11-21", time: "17:10" } },
        422,
        "outside_ordering_window",
      ],
      [
        { wishedTime: { date: "2026-11-23", time: "12:00" } },
        422,
        "outside_ordering_window",
      ],
    ];
    for (const [body, status, code] of cases) {
      const { error } = await order(client, body);
      expect([body, error?.statusCode, error?.data?.code]).toEqual([
        body,
        status,
        code,
      ]);
    }
  });
});

describe("the storefront URL of the backend's e-mail links", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function storefrontUrlWith(headers: Record<string, string>) {
    vi.resetModules();
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: {
        storeUrl: "https://shop.example",
        // the Shopware layer's setting of 2.x, no longer read (3.0)
        shopware: { devStorefrontUrl: "https://dev.example" },
      },
    }));
    vi.stubGlobal(
      "getRequestHeader",
      (_event: unknown, name: string) => headers[name],
    );
    const { storefrontUrl } = await import("../../server/utils/checkoutRoutes");
    return storefrontUrl({} as never);
  }

  it("is the origin the browser sent", async () => {
    await expect(
      storefrontUrlWith({ origin: "https://www.shop.example" }),
    ).resolves.toBe("https://www.shop.example");
  });

  it("is the store URL without an origin", async () => {
    await expect(storefrontUrlWith({})).resolves.toBe("https://shop.example");
  });
});
