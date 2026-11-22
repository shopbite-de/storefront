import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../../server/ports";
import {
  demoSeed,
  type MemoryContactMessage,
} from "../../server/adapters/memory";
import { CACHE_TTL, stubNitro } from "./nitroStubs";

/**
 * Wishlist and contact behind the BFF (ADR 0001, step 7) on the memory
 * adapter: domain answers, private, CSRF on writes, the wishlist only for
 * the logged-in customer (never another's, nothing with a replayed cookie
 * of before the logout), the contact form's fields checked (no line breaks
 * outside the message, no control characters), a honeypot answered like a
 * sent message, the visitor's address chain for the backend's limit.
 */
type Cookie = { name: string; value: string };

function browser() {
  return { cookies: new Map<string, string>() };
}
type Client = ReturnType<typeof browser>;

const copyOf = (client: Client): Client => ({
  cookies: new Map(client.cookies),
});

type Request = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  remoteAddress?: string;
};

function eventOf(client: Client, request: Request) {
  return {
    method: request.method,
    params: request.params ?? {},
    query: {},
    body: request.body,
    context: {} as Record<string, unknown>,
    headers: {
      host: "localhost:3000",
      ...(request.method === "GET" ? {} : { origin: "http://localhost:3000" }),
      ...request.headers,
    } as Record<string, string>,
    node: {
      req: { socket: { remoteAddress: request.remoteAddress ?? "10.0.0.5" } },
    },
    client,
    status: 200,
    setCookies: [] as Cookie[],
    responseHeaders: {} as Record<string, string>,
  };
}
type TestEvent = ReturnType<typeof eventOf>;

const ROUTES: Record<string, string> = {
  "POST /api/account/register": "../../server/api/account/register.post",
  "POST /api/account/login": "../../server/api/account/login.post",
  "POST /api/account/logout": "../../server/api/account/logout.post",
  "GET /api/wishlist": "../../server/api/wishlist/index.get",
  "POST /api/wishlist/entries": "../../server/api/wishlist/entries.post",
  "DELETE /api/wishlist/entries/[entryId]":
    "../../server/api/wishlist/entries/[entryId].delete",
  "POST /api/wishlist/merge": "../../server/api/wishlist/merge.post",
  "POST /api/contact": "../../server/api/contact/index.post",
  "GET /api/contact/form": "../../server/api/contact/form.get",
};

let backend: Backend;
let received: MemoryContactMessage[];

async function setup(seed = demoSeed()) {
  const memory = await import("../../server/adapters/memory");
  received = [];
  backend = memory.createMemoryBackend(seed, {
    contact: (message) => received.push(message),
  });
  const { answerDomain, toHttpError } =
    await import("../../server/utils/domainHttp");
  const session = await import("../../server/utils/visitorSession");
  const cartRoutes = await import("../../server/utils/cartRoutes");
  const checkoutRoutes = await import("../../server/utils/checkoutRoutes");
  const accountRoutes = await import("../../server/utils/accountRoutes");
  const wishlistRoutes = await import("../../server/utils/wishlistRoutes");
  const contactRoutes = await import("../../server/utils/contactRoutes");
  const requestBody = await import("../../server/utils/requestBody");
  stubNitro({
    answerDomain,
    toHttpError,
    ...session,
    ...cartRoutes,
    ...checkoutRoutes,
    ...accountRoutes,
    ...wishlistRoutes,
    ...contactRoutes,
    ...requestBody,
    useBackend: () => backend,
    useRuntimeConfig: () => ({
      public: {
        storeUrl: "http://localhost:3000",
        shopBite: { cacheTtl: CACHE_TTL, menuCategoryId: "" },
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
    setResponseStatus: (event: TestEvent, status: number) => {
      event.status = status;
    },
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
      error: error as Error & {
        statusCode: number;
        data?: { code?: string; details?: Record<string, unknown> };
      },
    };
  }
}

const PASSWORD = "geheim-12345";
const registration = (email: string) => ({
  email,
  firstName: "Erika",
  lastName: "Muster",
  business: false,
  password: PASSWORD,
  billingAddress: {
    street: "Musterstraße 1",
    postalCode: "12345",
    city: "Musterstadt",
    phone: "0123456789",
  },
});

async function customer(email = "erika@example.com") {
  const client = browser();
  const answer = await send(client, {
    method: "POST",
    path: "/api/account/register",
    body: registration(email),
  });
  expect(answer.error).toBeUndefined();
  return client;
}

/** A dish of the demo menu with extras and main ingredients. */
const dishWithExtras = () =>
  demoSeed().catalog.dishes.find(
    (dish) =>
      dish.variants.length === 0 &&
      dish.extraGroups.some((group) => group.extras.length) &&
      dish.ingredients.length,
  )!;

const configured = () => {
  const dish = dishWithExtras();
  return {
    dishId: dish.id,
    extraIds: [dish.extraGroups[0]!.extras[0]!.id],
    removedIngredientIds: [dish.ingredients[0]!.id],
  };
};

const add = (client: Client, body: unknown = configured()) =>
  send(client, { method: "POST", path: "/api/wishlist/entries", body });

const list = (client: Client) =>
  send(client, { method: "GET", path: "/api/wishlist" });

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the wishlist behind the BFF", () => {
  it("is 401 for a visitor, privately and without a session", async () => {
    await setup();
    const answer = await list(browser());
    expect(answer.error?.statusCode).toBe(401);
    expect(answer.error?.data?.code).toBe("unauthenticated");
    expect(answer.event.setCookies).toEqual([]);
    expect(answer.event.responseHeaders["cache-control"]).toBe(
      "private, no-store",
    );
  });

  it("keeps, lists and removes the customer's entries", async () => {
    await setup();
    const client = await customer();

    const added = await add(client);
    const entry = added.body as { id: string; dishNumber: string };
    expect(added.error).toBeUndefined();
    expect(entry.dishNumber).toBe(dishWithExtras().number);
    expect(
      ((await list(client)).body as { id: string }[]).map((e) => e.id),
    ).toEqual([entry.id]);

    const removed = await send(client, {
      method: "DELETE",
      path: "/api/wishlist/entries/[entryId]",
      params: { entryId: entry.id },
    });
    expect(removed.event.status).toBe(204);
    expect((await list(client)).body).toEqual([]);
  });

  it("merges the guest's configurations after the login", async () => {
    await setup();
    const client = await customer();
    const answer = await send(client, {
      method: "POST",
      path: "/api/wishlist/merge",
      body: { configurations: [configured(), configured()] },
    });
    expect((answer.body as unknown[]).length).toBe(1);
  });

  it("takes over the newest 100 of a longer guest wishlist", async () => {
    await setup();
    const client = await customer();
    const dish = dishWithExtras();
    const extras = dish.extraGroups.flatMap((group) => group.extras);
    // 101 different configurations: the dish with one extra each and then
    // the plain dish last
    const configurations = [
      ...extras
        .slice(0, 1)
        .map((extra) => ({ dishId: dish.id, extraIds: [extra.id] })),
      ...Array.from({ length: 99 }, () => ({
        dishId: dish.id,
        extraIds: [extras[0]!.id],
      })),
      { dishId: dish.id },
    ];
    const answer = await send(client, {
      method: "POST",
      path: "/api/wishlist/merge",
      body: { configurations },
    });
    expect(answer.error).toBeUndefined();
    // the 101st (the plain dish) is left out
    expect(
      (answer.body as { configuration: { extraIds: string[] } }[]).map(
        (entry) => entry.configuration.extraIds.length,
      ),
    ).toEqual([1]);
  });

  it("refuses a body the storefront would not send", async () => {
    await setup();
    const client = await customer();
    for (const body of [
      null,
      [],
      {},
      { dishId: "a b" },
      { dishId: "x".repeat(65) },
      { dishId: "d1", extraIds: "x1" },
      { dishId: "d1", extraIds: Array.from({ length: 30 }, (_, i) => `x${i}`) },
      { dishId: "d1", removedIngredientIds: ["i\n1"] },
      { dishId: "d1", variantId: 7 },
    ]) {
      const answer = await add(client, body);
      expect(answer.error?.statusCode, JSON.stringify(body)).toBe(400);
      expect(answer.error?.data?.code).toBe("invalid_value");
    }
    const tooMany = await send(client, {
      method: "POST",
      path: "/api/wishlist/merge",
      body: {
        configurations: Array.from({ length: 1001 }, () => configured()),
      },
    });
    expect(tooMany.error?.statusCode).toBe(400);
    const badId = await send(client, {
      method: "DELETE",
      path: "/api/wishlist/entries/[entryId]",
      params: { entryId: "../x" },
    });
    expect(badId.error?.statusCode).toBe(400);
  });

  it("refuses a dish the menu does not offer with a domain code", async () => {
    await setup();
    const client = await customer();
    const answer = await add(client, { dishId: "unknown-dish" });
    expect(answer.error?.statusCode).toBe(409);
    expect(answer.error?.data?.code).toBe("dish_unavailable");
  });

  it("refuses a write from another site", async () => {
    await setup();
    const client = await customer();
    const answer = await add(client, configured());
    const cross = await send(client, {
      method: "POST",
      path: "/api/wishlist/entries",
      body: configured(),
      headers: { origin: "https://evil.example" },
    });
    expect(answer.error).toBeUndefined();
    expect(cross.error?.statusCode).toBe(403);
    expect(cross.error?.data?.code).toBe("cross_site_request");
    const removal = await send(client, {
      method: "DELETE",
      path: "/api/wishlist/entries/[entryId]",
      params: { entryId: (answer.body as { id: string }).id },
      headers: { origin: "https://evil.example" },
    });
    expect(removal.error?.statusCode).toBe(403);
  });

  it("never shows or removes another customer's entries", async () => {
    await setup();
    const erika = await customer();
    const otto = await customer("otto@example.com");
    const entry = (await add(erika)).body as { id: string };

    expect((await list(otto)).body).toEqual([]);
    const removal = await send(otto, {
      method: "DELETE",
      path: "/api/wishlist/entries/[entryId]",
      params: { entryId: entry.id },
    });
    expect(removal.error?.statusCode).toBe(404);
    expect((await list(erika)).body).toHaveLength(1);
  });

  it("opens nothing with the cookie from before the logout", async () => {
    await setup();
    const client = await customer();
    await add(client);
    const before = copyOf(client);
    await send(client, { method: "POST", path: "/api/account/logout" });

    expect((await list(before)).error?.statusCode).toBe(401);
    const write = await add(before);
    // the process knows the newer cookie: the write is stale
    expect(write.error?.statusCode).toBe(409);
    expect(write.error?.data?.code).toBe("stale_session");
    expect((await list(client)).error?.statusCode).toBe(401);
  });
});

const MESSAGE = {
  firstName: "Erika",
  lastName: "Muster",
  email: "erika@example.com",
  phone: "0123 456789",
  subject: "Allergene",
  message: "Ist der Teig ohne Ei gemacht?\r\nDanke!",
};

const contact = (body: unknown, extra: Partial<Request> = {}) =>
  send(browser(), { method: "POST", path: "/api/contact", body, ...extra });

describe("contact messages behind the BFF", () => {
  it("hands the message to the backend, privately and without a session", async () => {
    await setup();
    const answer = await contact(MESSAGE);
    expect(answer.body).toEqual({ confirmation: null });
    expect(answer.event.setCookies).toEqual([]);
    expect(answer.event.responseHeaders["cache-control"]).toBe(
      "private, no-store",
    );
    expect(received).toEqual([
      {
        message: { ...MESSAGE, salutation: null },
        forwardedFor: "10.0.0.5",
      },
    ]);
  });

  it("sends empty optional fields as not given", async () => {
    await setup();
    await contact({
      ...MESSAGE,
      firstName: "",
      lastName: "",
      phone: "",
      salutation: undefined,
    });
    expect(received[0]!.message).toMatchObject({
      firstName: null,
      lastName: null,
      phone: null,
      salutation: null,
    });
  });

  it("refuses what the contact form would not send", async () => {
    await setup();
    const cases: [Record<string, unknown>, string][] = [
      [{ email: "keine-adresse" }, "email"],
      [{ email: "gast@example.com\r\nBcc: viele@example.com" }, "email"],
      [{ subject: "Hi" }, "subject"],
      [{ subject: "Frage\r\nBcc: viele@example.com" }, "subject"],
      [{ subject: "x".repeat(256) }, "subject"],
      [{ message: "Zu kurz" }, "message"],
      [{ message: "Eine Nachricht\u0000mit Nullbyte" }, "message"],
      [{ message: "x".repeat(10_001) }, "message"],
      [{ firstName: "Erika\nMuster" }, "firstName"],
      [{ lastName: "Muster\u0007" }, "lastName"],
      [{ phone: "0123\r\n456" }, "phone"],
      [{ salutation: "dr" }, "salutation"],
      [{ email: undefined }, "email"],
      [{ subject: "   " }, "subject"],
    ];
    for (const [change, field] of cases) {
      const answer = await contact({ ...MESSAGE, ...change });
      expect(answer.error?.statusCode, field).toBe(400);
      expect(answer.error?.data?.details?.field).toBe(field);
    }
    expect((await contact("text")).error?.statusCode).toBe(400);
    expect(received).toEqual([]);
  });

  it("answers a filled honeypot like a sent message without sending it", async () => {
    await setup();
    const answer = await contact({ ...MESSAGE, hp: "https://spam.example" });
    expect(answer.body).toEqual({ confirmation: null });
    expect(received).toEqual([]);
  });

  it("refuses a message from another site", async () => {
    await setup();
    const answer = await contact(MESSAGE, {
      headers: { origin: "https://evil.example" },
    });
    expect(answer.error?.statusCode).toBe(403);
    expect(received).toEqual([]);
  });

  it("limits a visitor's address, not another one", async () => {
    await setup();
    for (let sent = 0; sent < 3; sent++) {
      expect((await contact(MESSAGE)).error).toBeUndefined();
    }
    const limited = await contact(MESSAGE);
    expect(limited.error?.statusCode).toBe(429);
    expect(limited.error?.data?.code).toBe("rate_limited");
    expect(limited.error?.data?.details?.retryAfterSeconds).toBeGreaterThan(0);
    // another visitor is not held back
    const other = await contact(MESSAGE, { remoteAddress: "10.0.0.6" });
    expect(other.error).toBeUndefined();
    expect(received.map((entry) => entry.forwardedFor)).toEqual([
      "10.0.0.5",
      "10.0.0.5",
      "10.0.0.5",
      "10.0.0.6",
    ]);
  });

  it("answers the fields the restaurant requires and refuses a message without them", async () => {
    await setup({
      ...demoSeed(),
      contact: { required: { firstName: true, phone: true } },
    });
    const form = await send(browser(), {
      method: "GET",
      path: "/api/contact/form",
    });
    expect(form.body).toEqual({
      required: { firstName: true, lastName: false, phone: true },
    });
    const refused = await contact({ ...MESSAGE, phone: "  " });
    expect(refused.error?.statusCode).toBe(400);
    expect(refused.error?.data?.details?.field).toBe("phone");
    expect((await contact({ ...MESSAGE, lastName: "" })).error).toBeUndefined();
    expect(received).toHaveLength(1);
  });

  it("refuses a body above 64 KB before reading it", async () => {
    await setup();
    for (const path of ["/api/contact", "/api/wishlist/merge"]) {
      const answer = await send(browser(), {
        method: "POST",
        path,
        body: MESSAGE,
        headers: { "content-length": String(64 * 1024 + 1) },
      });
      expect(answer.error?.statusCode, path).toBe(413);
      expect(answer.error?.data?.code).toBe("payload_too_large");
    }
  });

  it("answers any filled honeypot without sending", async () => {
    await setup();
    for (const hp of [1, true, ["x"], { x: 1 }]) {
      expect((await contact({ ...MESSAGE, hp })).body).toEqual({
        confirmation: null,
      });
    }
    expect(received).toEqual([]);
  });

  it("counts the shortest subject and message without the spaces around them", async () => {
    await setup();
    expect(
      (await contact({ ...MESSAGE, subject: "  ab  " })).error?.data?.details
        ?.field,
    ).toBe("subject");
    expect(
      (await contact({ ...MESSAGE, message: "   kurz   x   " })).error?.data
        ?.details?.field,
    ).toBe("message");
  });

  it("refuses Unicode line breaks in single-line fields", async () => {
    await setup();
    for (const [field, value] of [
      ["subject", "Frage\u2028Bcc: x@example.com"],
      ["firstName", "Erika\u2029"],
      ["lastName", "Muster\u0085"],
    ]) {
      const answer = await contact({ ...MESSAGE, [field!]: value });
      expect(answer.error?.statusCode, field).toBe(400);
    }
    // the message keeps its line breaks
    expect(
      (await contact({ ...MESSAGE, message: "Zeile eins\u2028Zeile zwei" }))
        .error,
    ).toBeUndefined();
  });

  it("passes the incoming chain on with the socket address appended", async () => {
    await setup();
    await contact(MESSAGE, {
      headers: { "x-forwarded-for": "203.0.113.7" },
      remoteAddress: "172.18.0.4",
    });
    expect(received[0]!.forwardedFor).toBe("203.0.113.7, 172.18.0.4");
  });
});
