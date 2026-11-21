import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../../server/ports";
import { CHEESE, COLA, MARGHERITA, PIZZERIA } from "../contract/cart.contract";
import { stubNitro } from "./nitroStubs";

/**
 * The cart behind the BFF (ADR 0001, step 4): domain answers, the
 * storefront session in an HttpOnly cookie, the backend token server-side,
 * CSRF on writes, no answer a cache may keep.
 */
type Cookie = { name: string; value: string; options: Record<string, unknown> };

/** A browser: keeps the cookies the answers set. */
function browser(initial: Record<string, string> = {}) {
  const cookies = new Map(Object.entries(initial));
  return { cookies };
}

type Request = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

function eventOf(client: ReturnType<typeof browser>, request: Request) {
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
    // the bridge reads its body from the stream
    node: {
      req: Object.assign(
        Readable.from(
          typeof request.body === "string" ? [Buffer.from(request.body)] : [],
        ),
        { socket: { remoteAddress: "10.0.0.5" } },
      ),
    },
    client,
    setCookies: [] as Cookie[],
    responseHeaders: {} as Record<string, string>,
    status: 200,
  };
}
type TestEvent = ReturnType<typeof eventOf>;

const ROUTES: Record<string, string> = {
  "GET /api/cart": "../../server/api/cart/index.get",
  "POST /api/cart/lines": "../../server/api/cart/lines.post",
  "PATCH /api/cart/lines/[lineId]":
    "../../server/api/cart/lines/[lineId].patch",
  "DELETE /api/cart/lines/[lineId]":
    "../../server/api/cart/lines/[lineId].delete",
  "POST /api/cart/vouchers": "../../server/api/cart/vouchers.post",
  "DELETE /api/cart/vouchers/[code]":
    "../../server/api/cart/vouchers/[code].delete",
  "POST /api/store-api/[...path]": "../../server/api/store-api/[...path]",
};

let backend: Backend;

async function setup(given?: Backend) {
  const memory = await import("../contract/cartFixtures");
  backend = given ?? (await memory.memoryCart.create(PIZZERIA));
  const { answerDomain } = await import("../../server/utils/domainHttp");
  const session = await import("../../server/utils/visitorSession");
  const cartRoutes = await import("../../server/utils/cartRoutes");
  stubNitro({
    answerDomain,
    ...session,
    ...cartRoutes,
    useBackend: () => backend,
    useRuntimeConfig: () => ({
      public: {
        storeUrl: "http://localhost:3000",
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
    setCookie: (
      event: TestEvent,
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => {
      event.setCookies.push({ name, value, options });
      event.client.cookies.set(name, value);
    },
    deleteCookie: (event: TestEvent, name: string) => {
      event.setCookies.push({ name, value: "", options: { maxAge: 0 } });
      event.client.cookies.delete(name);
    },
    getRequestHeader: (event: TestEvent, name: string) => event.headers[name],
    setResponseHeader: (event: TestEvent, name: string, value: string) => {
      event.responseHeaders[name] = value;
    },
    readBody: async (event: TestEvent) => event.body,
    getRequestHeaders: (event: TestEvent) => event.headers,
    getRequestURL: () => new URL("http://localhost:3000/"),
    setResponseStatus: (event: TestEvent, status: number) => {
      event.status = status;
    },
    getRouterParam: (event: TestEvent, name: string) => event.params[name],
  });
}

async function send(client: ReturnType<typeof browser>, request: Request) {
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
      error: error as { statusCode: number; data?: { code?: string } },
    };
  }
}

const addCola = (client: ReturnType<typeof browser>, quantity = 1) =>
  send(client, {
    method: "POST",
    path: "/api/cart/lines",
    body: { dishId: COLA, quantity },
  });

type CartAnswer = {
  lines: { id: string; quantity: number; configuration: { dishId: string } }[];
  discounts: unknown[];
  messages: { code: string; subjectId: string | null }[];
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/cart", () => {
  it("answers an empty cart to a new visitor without giving them a session", async () => {
    await setup();
    const client = browser();
    const { body, event } = await send(client, {
      method: "GET",
      path: "/api/cart",
    });

    expect((body as CartAnswer).lines).toEqual([]);
    expect(event.setCookies).toEqual([]);
    expect(event.responseHeaders["cache-control"]).toBe("private, no-store");
  });
});

describe("POST /api/cart/lines", () => {
  it("adds the line, starts the session in an HttpOnly cookie and finds the cart again", async () => {
    await setup();
    const client = browser();
    const { body, event } = await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: {
        dishId: MARGHERITA,
        extraIds: [CHEESE],
        removedIngredientIds: [],
        quantity: 2,
      },
    });

    expect((body as CartAnswer).lines.map((line) => line.quantity)).toEqual([
      2,
    ]);
    expect(event.setCookies).toEqual([
      {
        name: "shopbite-session",
        // sealed: the backend's state is not readable
        value: expect.stringMatching(/^v1\./),
        options: {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 86400,
        },
      },
    ]);
    expect(event.responseHeaders["cache-control"]).toBe("private, no-store");

    const again = await send(client, { method: "GET", path: "/api/cart" });
    expect((again.body as CartAnswer).lines).toHaveLength(1);
  });

  it("refuses a write a page of another site made the browser send", async () => {
    await setup();
    const client = browser();
    const { error, event } = await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 1 },
      headers: { origin: "https://evil.example" },
    });

    expect(error).toMatchObject({
      statusCode: 403,
      data: { code: "cross_site_request" },
    });
    expect(event.setCookies).toEqual([]);
    const sameSite = await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 1 },
      headers: {
        origin: undefined as unknown as string,
        "sec-fetch-site": "same-site",
      },
    });
    expect(sameSite.error?.statusCode).toBe(403);
  });

  it("answers an invalid body with 400 and the domain code", async () => {
    await setup();
    for (const body of [
      undefined,
      { quantity: 1 },
      { dishId: COLA },
      { dishId: COLA, quantity: "2" },
      { dishId: "../x", quantity: 1 },
      { dishId: COLA, quantity: 1, extraIds: "x" },
      {
        dishId: COLA,
        quantity: 1,
        extraIds: Array.from({ length: 30 }, (_, i) => `e${i}`),
      },
      { dishId: COLA, quantity: 1, removedIngredientIds: [42] },
      { dishId: COLA, quantity: 0 },
    ]) {
      const { error } = await send(browser(), {
        method: "POST",
        path: "/api/cart/lines",
        body,
      });
      expect(error, JSON.stringify(body)).toMatchObject({
        statusCode: 400,
        data: { code: "invalid_value" },
      });
    }
  });

  it("answers a dish the menu does not offer with 409 dish_unavailable", async () => {
    await setup();
    const { error } = await send(browser(), {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: "9f9f9f9f9f9f4f9f8f9f9f9f9f9f9f9f", quantity: 1 },
    });
    expect(error).toMatchObject({
      statusCode: 409,
      data: { code: "dish_unavailable" },
    });
  });
});

describe("cart line routes", () => {
  it("change the quantity and remove a line", async () => {
    await setup();
    const client = browser();
    const added = (await addCola(client)).body as CartAnswer;
    const lineId = added.lines[0]!.id;

    const changed = await send(client, {
      method: "PATCH",
      path: "/api/cart/lines/[lineId]",
      params: { lineId },
      body: { quantity: 4 },
    });
    expect((changed.body as CartAnswer).lines[0]!.quantity).toBe(4);

    const removed = await send(client, {
      method: "DELETE",
      path: "/api/cart/lines/[lineId]",
      params: { lineId },
    });
    expect((removed.body as CartAnswer).lines).toEqual([]);
  });

  it("answer an invalid or unknown line with 400 and 404", async () => {
    await setup();
    const client = browser();
    await addCola(client);
    const invalid = await send(client, {
      method: "DELETE",
      path: "/api/cart/lines/[lineId]",
      params: { lineId: "a/../b" },
    });
    expect(invalid.error).toMatchObject({ statusCode: 400 });
    const unknown = await send(client, {
      method: "PATCH",
      path: "/api/cart/lines/[lineId]",
      params: { lineId: "0f0f0f0f0f0f4f0f8f0f0f0f0f0f0f0f" },
      body: { quantity: 2 },
    });
    expect(unknown.error).toMatchObject({
      statusCode: 404,
      data: { code: "not_found" },
    });
  });
});

describe("voucher routes", () => {
  it("apply a voucher, report an unknown one and remove it", async () => {
    await setup();
    const client = browser();
    await addCola(client, 3);

    const applied = await send(client, {
      method: "POST",
      path: "/api/cart/vouchers",
      body: { code: "WILLKOMMEN" },
    });
    expect((applied.body as CartAnswer).discounts).toHaveLength(1);

    const unknown = await send(client, {
      method: "POST",
      path: "/api/cart/vouchers",
      body: { code: "GIBTSNICHT" },
    });
    expect((unknown.body as CartAnswer).messages).toContainEqual(
      expect.objectContaining({
        code: "voucher_invalid",
        subjectId: "GIBTSNICHT",
      }),
    );

    const removed = await send(client, {
      method: "DELETE",
      path: "/api/cart/vouchers/[code]",
      params: { code: "WILLKOMMEN" },
    });
    expect((removed.body as CartAnswer).discounts).toEqual([]);
  });
});

describe("the session behind the cart (Shopware)", () => {
  async function shopware(
    fake?: ReturnType<
      (typeof import("../contract/cartFixtures"))["fakeShopwareCart"]
    >,
  ) {
    const { fakeShopwareCart } = await import("../contract/cartFixtures");
    const { createShopwareBackend } =
      await import("../../server/adapters/shopware");
    fake ??= fakeShopwareCart(PIZZERIA);
    await setup(
      createShopwareBackend({
        storeApi: fake.storeApi,
        visitorApi: fake.visitorApi,
        storeUrl: "http://localhost:3000",
        timeZone: "Europe/Berlin",
        log: () => {},
      }),
    );
    return fake;
  }

  it("keeps the cart over a restart of the storefront", async () => {
    const fake = await shopware();
    const client = browser();
    await addCola(client, 2);

    // a new process: modules, registry and adapter instance are new
    vi.resetModules();
    await shopware(fake);
    const after = await send(client, { method: "GET", path: "/api/cart" });

    expect(
      (after.body as CartAnswer).lines.map((line) => [
        line.configuration.dishId,
        line.quantity,
      ]),
    ).toEqual([[COLA, 2]]);
  });

  it("refuses a write that carries a session a parallel request replaced (409, retryable)", async () => {
    const fake = await shopware();
    const client = browser();
    await addCola(client);
    const old = new Map(client.cookies);

    // Shopware replaces the token (as on a login) while answering this write
    const send0 = fake.visitorApi.send;
    fake.visitorApi.send = async (request) => ({
      ...(await send0(request)),
      contextToken: "rotated-token-0123456789abcdefABCD",
    });
    const rotating = await addCola(client);
    expect(rotating.event.setCookies.map((cookie) => cookie.name)).toEqual([
      "shopbite-session",
    ]);
    fake.visitorApi.send = send0;

    // a request sent with the cookie before the rotation
    const stale = browser(Object.fromEntries(old));
    const write = await addCola(stale);
    expect(write.error).toMatchObject({
      statusCode: 409,
      data: { code: "stale_session" },
    });
    expect(write.event.setCookies).toEqual([]);
    // a read with it still answers, and sets no cookie
    const read = await send(stale, { method: "GET", path: "/api/cart" });
    expect(read.error).toBeUndefined();
    expect(read.event.setCookies).toEqual([]);
    // the browser's current cookie works
    expect((await addCola(client)).error).toBeUndefined();
  });

  it("never loses a cart write that overlaps a registration through the bridge", async () => {
    const outcomes: string[] = [];
    for (let trial = 0; trial < 15; trial++) {
      vi.resetModules();
      const fake = await shopware();
      const client = browser();
      await addCola(client);
      const cookie = Object.fromEntries(client.cookies);

      // Shopware registers the guest: a new token, the cart moves with it
      vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
        await new Promise((resolve) => setTimeout(resolve, 5 + (trial % 4)));
        const old = (init.headers as Record<string, string>)[
          "sw-context-token"
        ]!;
        const registered = `registered-${trial}-0123456789abcdefABCD`;
        fake.carts.set(registered, fake.carts.get(old) ?? []);
        fake.carts.delete(old);
        return new Response("{}", {
          headers: {
            "content-type": "application/json",
            "sw-context-token": registered,
          },
        });
      });

      // the cart's own write to Shopware is slower than the registration:
      // without one-at-a-time it would land in the replaced token's cart
      const send0 = fake.visitorApi.send;
      fake.visitorApi.send = async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return send0(request);
      };

      const registering = browser(cookie);
      const adding = browser(cookie);
      const order = trial % 2;
      const [register, add] = await Promise.all(
        order
          ? [
              send(registering, {
                method: "POST",
                path: "/api/store-api/[...path]",
                params: { path: "account/register" },
                body: "{}",
              }),
              addCola(adding),
            ]
          : [
              new Promise<Awaited<ReturnType<typeof send>>>((resolve) =>
                setTimeout(
                  () =>
                    resolve(
                      send(registering, {
                        method: "POST",
                        path: "/api/store-api/[...path]",
                        params: { path: "account/register" },
                        body: "{}",
                      }),
                    ),
                  1,
                ),
              ),
              addCola(adding),
            ],
      );
      expect(register.error).toBeUndefined();
      expect(register.event.status).toBe(200);

      // the browser now holds the newest cookie
      const now = browser(Object.fromEntries(registering.cookies));
      const after = await send(now, { method: "GET", path: "/api/cart" });
      const quantity =
        (after.body as CartAnswer).lines.find(
          (line) => line.configuration.dishId === COLA,
        )?.quantity ?? 0;
      if (add.error) {
        expect(add.error).toMatchObject({
          statusCode: 409,
          data: { code: "stale_session" },
        });
        expect(quantity).toBe(1);
        outcomes.push("409");
      } else {
        // the write went first, with the old token: the cart moved with it
        expect(quantity).toBe(2);
        outcomes.push("200");
      }
      vi.unstubAllGlobals();
    }
    expect(outcomes).toHaveLength(15);
  });

  it("keeps the cart of a visitor of the old layer (sw-context-token cookie) once", async () => {
    const fake = await shopware();
    // a cart the visitor filled before the upgrade
    await fake.visitorApi.send({
      method: "POST",
      path: "/checkout/cart/line-item",
      body: { items: [{ id: COLA, quantity: 2, type: "product" }] },
      contextToken: "OldLayerToken0123456789abcdefABC",
    });
    const client = browser({
      "sw-context-token": "OldLayerToken0123456789abcdefABC",
    });

    const { body, event } = await send(client, {
      method: "GET",
      path: "/api/cart",
    });

    expect(
      (body as CartAnswer).lines.map((line) => [
        line.configuration.dishId,
        line.quantity,
      ]),
    ).toEqual([[COLA, 2]]);
    expect(client.cookies.has("sw-context-token")).toBe(false);
    expect(event.setCookies.map((cookie) => cookie.name).sort()).toEqual([
      "shopbite-session",
      "sw-context-token",
    ]);
    const next = await send(client, { method: "GET", path: "/api/cart" });
    expect((next.body as CartAnswer).lines).toHaveLength(1);
    expect(fake.requests.at(-1)?.contextToken).toBe(
      "OldLayerToken0123456789abcdefABC",
    );
  });

  it("never answers the backend token: not in the body, not in a cookie", async () => {
    const fake = await shopware();
    const client = browser();
    const { body, event } = await addCola(client);

    const token = fake.requests[0] && [...fake.carts.keys()][0]!;
    expect(token).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(event.setCookies)).not.toContain(token);
    expect([...client.cookies.values()]).not.toContain(token);
  });

  it("answers an outage with 503 and the domain code", async () => {
    const fake = await shopware();
    const client = browser();
    await addCola(client);
    fake.visitorApi.send = async () => {
      throw new Error("ECONNREFUSED");
    };
    const { error } = await send(client, {
      method: "GET",
      path: "/api/cart",
    });
    expect(error).toMatchObject({
      statusCode: 503,
      data: { code: "backend_unavailable" },
    });
  });

  it("mixes nothing between two visitors writing in parallel", async () => {
    await shopware();
    const alice = browser();
    const bob = browser();
    await Promise.all([addCola(alice), addCola(bob)]);

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        i % 2
          ? addCola(alice)
          : send(bob, {
              method: "POST",
              path: "/api/cart/lines",
              body: { dishId: MARGHERITA, quantity: 1 },
            }),
      ),
    );

    const [a, b] = await Promise.all([
      send(alice, { method: "GET", path: "/api/cart" }),
      send(bob, { method: "GET", path: "/api/cart" }),
    ]);
    expect(
      (a.body as CartAnswer).lines.map((line) => [
        line.configuration.dishId,
        line.quantity,
      ]),
    ).toEqual([[COLA, 6]]);
    expect(
      (b.body as CartAnswer).lines.map((line) => [
        line.configuration.dishId,
        line.quantity,
      ]),
    ).toEqual([
      [COLA, 1],
      [MARGHERITA, 5],
    ]);
    expect(alice.cookies.get("shopbite-session")).not.toBe(
      bob.cookies.get("shopbite-session"),
    );
  });

  it("runs the writes of one visitor one after the other", async () => {
    const fake = await shopware();
    const client = browser();
    await addCola(client);
    let running = 0;
    let most = 0;
    const send0 = fake.visitorApi.send;
    fake.visitorApi.send = async (request) => {
      running++;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      try {
        return await send0(request);
      } finally {
        running--;
      }
    };

    await Promise.all(Array.from({ length: 5 }, () => addCola(client)));

    expect(most).toBe(1);
    const cart = await send(client, { method: "GET", path: "/api/cart" });
    expect((cart.body as CartAnswer).lines[0]!.quantity).toBe(6);
  });
});
