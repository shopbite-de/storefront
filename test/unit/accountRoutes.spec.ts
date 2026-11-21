import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../../server/ports";
import { demoSeed, type MemoryMail } from "../../server/adapters/memory";
import { CACHE_TTL, stubNitro } from "./nitroStubs";

/**
 * The customer's account behind the BFF (ADR 0001, step 6) on the memory
 * adapter: domain answers, private, CSRF on writes, the session resealed
 * on login, logout and registration (a replayed cookie of before opens
 * nothing, its writes are stale), passwords never answered or logged,
 * another customer's addresses never reachable.
 */
type Cookie = { name: string; value: string };

function browser() {
  return { cookies: new Map<string, string>() };
}
type Client = ReturnType<typeof browser>;

/** A browser with a copy of another's cookies (a replayed cookie). */
const copyOf = (client: Client): Client => ({
  cookies: new Map(client.cookies),
});

type Request = {
  method: string;
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

function eventOf(client: Client, request: Request) {
  return {
    method: request.method,
    params: request.params ?? {},
    query: request.query ?? {},
    body: request.body,
    context: {} as Record<string, unknown>,
    headers: {
      host: "localhost:3000",
      ...(request.method === "GET" ? {} : { origin: "http://localhost:3000" }),
      ...request.headers,
    } as Record<string, string>,
    node: { req: { socket: { remoteAddress: "10.0.0.5" } } },
    client,
    status: 200,
    setCookies: [] as Cookie[],
    responseHeaders: {} as Record<string, string>,
  };
}
type TestEvent = ReturnType<typeof eventOf>;

const ROUTES: Record<string, string> = {
  "GET /api/cart": "../../server/api/cart/index.get",
  "POST /api/cart/lines": "../../server/api/cart/lines.post",
  "GET /api/account": "../../server/api/account/index.get",
  "DELETE /api/account": "../../server/api/account/index.delete",
  "POST /api/account/login": "../../server/api/account/login.post",
  "POST /api/account/logout": "../../server/api/account/logout.post",
  "POST /api/account/register": "../../server/api/account/register.post",
  "POST /api/account/register/confirm":
    "../../server/api/account/register/confirm.post",
  "POST /api/account/password-reset":
    "../../server/api/account/password-reset.post",
  "POST /api/account/password-reset/confirm":
    "../../server/api/account/password-reset/confirm.post",
  "PATCH /api/account/profile": "../../server/api/account/profile.patch",
  "POST /api/account/email": "../../server/api/account/email.post",
  "POST /api/account/password": "../../server/api/account/password.post",
  "GET /api/account/orders": "../../server/api/account/orders.get",
  "GET /api/account/addresses": "../../server/api/account/addresses/index.get",
  "POST /api/account/addresses":
    "../../server/api/account/addresses/index.post",
  "PATCH /api/account/addresses/[addressId]":
    "../../server/api/account/addresses/[addressId].patch",
  "DELETE /api/account/addresses/[addressId]":
    "../../server/api/account/addresses/[addressId].delete",
  "POST /api/account/addresses/[addressId]/default":
    "../../server/api/account/addresses/[addressId]/default.post",
};

let backend: Backend;
let mails: MemoryMail[];

async function setup(
  wrap: (backend: Backend) => Backend = (given) => given,
  seed = demoSeed(),
) {
  const memory = await import("../../server/adapters/memory");
  mails = [];
  backend = wrap(
    memory.createMemoryBackend(seed, { mail: (mail) => mails.push(mail) }),
  );
  const { answerDomain, toHttpError } =
    await import("../../server/utils/domainHttp");
  const session = await import("../../server/utils/visitorSession");
  const cartRoutes = await import("../../server/utils/cartRoutes");
  const checkoutRoutes = await import("../../server/utils/checkoutRoutes");
  const accountRoutes = await import("../../server/utils/accountRoutes");
  stubNitro({
    answerDomain,
    toHttpError,
    ...session,
    ...cartRoutes,
    ...checkoutRoutes,
    ...accountRoutes,
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
    getQuery: (event: TestEvent) => event.query,
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

const COLA = demoSeed().catalog.dishes.find(
  (dish) => dish.variants.length === 0 && dish.available,
)!.id;

const PASSWORD = "geheim-12345";

const REGISTRATION = {
  email: "erika@example.com",
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
};

const ADDRESS = {
  firstName: "Erika",
  lastName: "Muster",
  street: "Nebenweg 7",
  postalCode: "54321",
  city: "Anderswo",
  phone: "0987654321",
};

const customerOf = async (client: Client) =>
  (
    (await send(client, { method: "GET", path: "/api/account" })).body as {
      customer: { email: string; guest: boolean } | null;
    }
  ).customer;

async function registered(registration = REGISTRATION) {
  const client = browser();
  const answer = await send(client, {
    method: "POST",
    path: "/api/account/register",
    body: registration,
  });
  expect(answer.error).toBeUndefined();
  return client;
}

const login = (
  client: Client,
  password = PASSWORD,
  email = REGISTRATION.email,
) =>
  send(client, {
    method: "POST",
    path: "/api/account/login",
    body: { email, password },
  });

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the account behind the BFF", () => {
  it("answers no customer to a visitor, privately and without a session", async () => {
    await setup();
    const client = browser();
    const answer = await send(client, { method: "GET", path: "/api/account" });
    expect(answer.body).toEqual({ customer: null });
    expect(answer.event.setCookies).toEqual([]);
    expect(answer.event.responseHeaders["cache-control"]).toBe(
      "private, no-store",
    );
  });

  it("registers and logs in; the cookie before opens nothing", async () => {
    await setup();
    const client = browser();
    await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 2 },
    });
    const before = copyOf(client);
    const answer = await send(client, {
      method: "POST",
      path: "/api/account/register",
      body: REGISTRATION,
    });
    expect(answer.body).toMatchObject({
      confirmationRequired: false,
      customer: { guest: false, email: REGISTRATION.email },
    });
    expect(JSON.stringify(answer.body)).not.toContain(PASSWORD);
    // a new seal
    expect(answer.event.setCookies).toHaveLength(1);
    expect(client.cookies.get("shopbite-session")).not.toBe(
      before.cookies.get("shopbite-session"),
    );
    expect(await customerOf(client)).toMatchObject({
      email: REGISTRATION.email,
    });
    // the cart moved with the login
    const cart = await send(client, { method: "GET", path: "/api/cart" });
    expect((cart.body as { lines: unknown[] }).lines).toHaveLength(1);
    // the replayed cookie of before the registration: no account, no cart,
    // and its writes are stale
    expect(await customerOf(before)).toBeNull();
    const stale = await send(before, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 1 },
    });
    expect(stale.error?.statusCode).toBe(409);
    expect(stale.error?.data?.code).toBe("stale_session");
  });

  it("logs in and out; a replayed cookie never opens the account", async () => {
    await setup();
    const owner = await registered();
    await send(owner, { method: "POST", path: "/api/account/logout" });

    const client = browser();
    await send(client, {
      method: "POST",
      path: "/api/cart/lines",
      body: { dishId: COLA, quantity: 1 },
    });
    const preLogin = copyOf(client);
    const logged = await login(client);
    expect(logged.error).toBeUndefined();
    expect(logged.body).toMatchObject({ email: REGISTRATION.email });
    expect(await customerOf(preLogin)).toBeNull();
    expect(
      (await send(preLogin, { method: "GET", path: "/api/account/addresses" }))
        .error?.statusCode,
    ).toBe(401);

    const loggedIn = copyOf(client);
    const out = await send(client, {
      method: "POST",
      path: "/api/account/logout",
    });
    expect(out.event.status).toBe(204);
    expect(await customerOf(client)).toBeNull();
    // the logged-in cookie after the logout
    expect(await customerOf(loggedIn)).toBeNull();
    const replayed = await send(loggedIn, {
      method: "GET",
      path: "/api/account/addresses",
    });
    expect(replayed.error?.statusCode).toBe(401);
    const staleWrite = await send(loggedIn, {
      method: "PATCH",
      path: "/api/account/profile",
      body: { firstName: "Mallory", lastName: "X" },
    });
    expect(staleWrite.error?.data?.code).toBe("stale_session");
  });

  it("answers a wrong password and an unknown e-mail alike, without the password", async () => {
    await setup();
    await registered();
    const logs = [
      vi.spyOn(console, "error").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "log").mockImplementation(() => {}),
    ];
    const wrong = await login(browser(), "wrong-secret-xyz");
    const unknown = await login(browser(), "wrong-secret-xyz", "x@example.com");
    for (const answer of [wrong, unknown]) {
      expect(answer.error?.statusCode).toBe(401);
      expect(answer.error?.data).toEqual({ code: "invalid_credentials" });
      expect(JSON.stringify(answer.error)).not.toContain("wrong-secret-xyz");
    }
    for (const spy of logs) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("wrong-secret-xyz");
    }
  });

  it("logs no password when the backend fails", async () => {
    // the class the routes see after `vi.resetModules()`
    const { DomainError } = await import("../../shared/domain");
    await setup((given) => ({
      ...given,
      customer: {
        ...given.customer,
        login: async () => {
          throw new DomainError(
            "backend_unavailable",
            "The backend did not answer.",
            {},
            { cause: new Error("status 503") },
          );
        },
      },
    }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const answer = await login(browser(), "secret-in-flight-1");
    expect(answer.error?.statusCode).toBe(503);
    expect(answer.error?.data).toEqual({ code: "backend_unavailable" });
    expect(error).toHaveBeenCalled();
    expect(
      JSON.stringify(error.mock.calls, (_key, value) =>
        value instanceof Error
          ? { message: value.message, cause: String(value.cause) }
          : value,
      ),
    ).not.toContain("secret-in-flight-1");
  });

  it("limits failed logins with 429 and the time to wait", async () => {
    await setup();
    await registered();
    let answer: Awaited<ReturnType<typeof login>> | undefined;
    for (let attempt = 0; attempt < 11; attempt++) {
      answer = await login(browser(), "wrong-password");
    }
    expect(answer?.error?.statusCode).toBe(429);
    expect(answer?.error?.data?.code).toBe("rate_limited");
    expect(answer?.error?.data?.details?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refuses writes of another site and bodies the forms never send", async () => {
    await setup();
    const crossSite = await send(browser(), {
      method: "POST",
      path: "/api/account/login",
      body: { email: REGISTRATION.email, password: PASSWORD },
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.error?.statusCode).toBe(403);
    expect(crossSite.error?.data?.code).toBe("cross_site_request");

    for (const [path, body, field] of [
      ["/api/account/login", { password: PASSWORD }, "email"],
      ["/api/account/login", { email: "erika@example.com" }, "password"],
      [
        "/api/account/login",
        { email: "erika@example.com", password: "x".repeat(4097) },
        "password",
      ],
      ["/api/account/register", { ...REGISTRATION, password: "" }, "password"],
      ["/api/account/password-reset", { email: "no-mail" }, "email"],
      [
        "/api/account/password-reset/confirm",
        { token: "a b", newPassword: PASSWORD },
        "token",
      ],
      ["/api/account/register/confirm", { em: "<script>" }, "em"],
    ] as const) {
      const answer = await send(browser(), { method: "POST", path, body });
      expect(answer.error?.statusCode, `${path} ${field}`).toBe(400);
      expect(answer.error?.data?.details?.field).toBe(field);
    }
  });

  it("answers the password reset the same for an unknown e-mail", async () => {
    await setup();
    await registered();
    const unknown = await send(browser(), {
      method: "POST",
      path: "/api/account/password-reset",
      body: { email: "nobody@example.com" },
    });
    const known = await send(browser(), {
      method: "POST",
      path: "/api/account/password-reset",
      body: { email: REGISTRATION.email },
    });
    expect([unknown.event.status, unknown.body, unknown.error]).toEqual([
      204,
      null,
      undefined,
    ]);
    expect([known.event.status, known.body, known.error]).toEqual([
      204,
      null,
      undefined,
    ]);
    const mail = mails.find((entry) => entry.kind === "password_reset");
    expect(mail?.url).toMatch(
      /^http:\/\/localhost:3000\/account\/recover\/password\?hash=/,
    );
    const reset = await send(browser(), {
      method: "POST",
      path: "/api/account/password-reset/confirm",
      body: {
        token: mail?.kind === "password_reset" ? mail.resetToken : "",
        newPassword: "neues-geheim-1",
      },
    });
    expect(reset.event.status).toBe(204);
    expect((await login(browser(), "neues-geheim-1")).error).toBeUndefined();
  });

  it("never reads or writes another customer's addresses or orders", async () => {
    await setup();
    const owner = await registered();
    const created = await send(owner, {
      method: "POST",
      path: "/api/account/addresses",
      body: ADDRESS,
    });
    const id = (created.body as { id: string }).id;
    const intruder = await registered({
      ...REGISTRATION,
      email: "otto@example.com",
    });
    const listed = await send(intruder, {
      method: "GET",
      path: "/api/account/addresses",
    });
    expect(JSON.stringify(listed.body)).not.toContain(id);
    for (const request of [
      {
        method: "PATCH",
        path: "/api/account/addresses/[addressId]",
        params: { addressId: id },
        body: { ...ADDRESS, street: "Gestohlen 1" },
      },
      {
        method: "DELETE",
        path: "/api/account/addresses/[addressId]",
        params: { addressId: id },
      },
      {
        method: "POST",
        path: "/api/account/addresses/[addressId]/default",
        params: { addressId: id },
        body: { use: "delivery" },
      },
      {
        method: "PATCH",
        path: "/api/account/addresses/[addressId]",
        params: { addressId: "0123456789abcdef0123456789abcdef" },
        body: ADDRESS,
      },
    ]) {
      const answer = await send(intruder, request);
      expect(answer.error?.statusCode, request.method).toBe(404);
    }
    const guessed = await send(intruder, {
      method: "PATCH",
      path: "/api/account/addresses/[addressId]",
      params: { addressId: "../../order" },
      body: ADDRESS,
    });
    expect(guessed.error?.statusCode).toBe(400);
    const ownList = await send(owner, {
      method: "GET",
      path: "/api/account/addresses",
    });
    expect(JSON.stringify(ownList.body)).toContain("Nebenweg 7");
    expect(JSON.stringify(ownList.body)).not.toContain("Gestohlen");
  });

  it("changes defaults, refuses deleting one and lists the orders", async () => {
    await setup();
    const client = await registered();
    const created = await send(client, {
      method: "POST",
      path: "/api/account/addresses",
      body: ADDRESS,
    });
    const id = (created.body as { id: string }).id;
    const defaulted = await send(client, {
      method: "POST",
      path: "/api/account/addresses/[addressId]/default",
      params: { addressId: id },
      body: { use: "delivery" },
    });
    expect(defaulted.body).toMatchObject({ defaultDeliveryAddressId: id });
    const inUse = await send(client, {
      method: "DELETE",
      path: "/api/account/addresses/[addressId]",
      params: { addressId: id },
    });
    expect(inUse.error?.statusCode).toBe(409);
    expect(inUse.error?.data?.code).toBe("address_in_use");
    const orders = await send(client, {
      method: "GET",
      path: "/api/account/orders",
    });
    expect(orders.body).toMatchObject({ orders: [], total: 0, page: 1 });
    const visitor = await send(browser(), {
      method: "GET",
      path: "/api/account/orders",
    });
    expect(visitor.error?.statusCode).toBe(401);
    const badPage = await send(client, {
      method: "GET",
      path: "/api/account/orders",
      query: { page: "0" },
    });
    expect(badPage.error?.statusCode).toBe(400);
  });

  it("changes the e-mail and the password with the password", async () => {
    await setup();
    const client = await registered();
    const wrong = await send(client, {
      method: "POST",
      path: "/api/account/email",
      body: { email: "erika.neu@example.com", password: "nope-nope" },
    });
    expect(wrong.error?.data).toEqual({ code: "invalid_credentials" });
    const changed = await send(client, {
      method: "POST",
      path: "/api/account/email",
      body: { email: "erika.neu@example.com", password: PASSWORD },
    });
    expect(changed.body).toMatchObject({ email: "erika.neu@example.com" });
    const password = await send(client, {
      method: "POST",
      path: "/api/account/password",
      body: { currentPassword: PASSWORD, newPassword: "neues-geheim-9" },
    });
    expect(password.event.status).toBe(204);
    expect(
      (await login(browser(), "neues-geheim-9", "erika.neu@example.com")).error,
    ).toBeUndefined();
  });

  it("confirms a registration with double opt-in", async () => {
    const seed = demoSeed();
    await setup(undefined, { ...seed, customer: { doubleOptIn: true } });
    const client = browser();
    const answer = await send(client, {
      method: "POST",
      path: "/api/account/register",
      body: REGISTRATION,
    });
    expect(answer.body).toMatchObject({ confirmationRequired: true });
    expect(await customerOf(client)).toBeNull();
    const notYet = await login(browser());
    expect(notYet.error?.statusCode).toBe(403);
    expect(notYet.error?.data?.code).toBe("account_not_confirmed");
    const mail = mails.find((entry) => entry.kind === "registration");
    const confirmation = mail?.kind === "registration" ? mail.confirmation : {};
    const confirmed = await send(client, {
      method: "POST",
      path: "/api/account/register/confirm",
      body: confirmation,
    });
    expect(confirmed.body).toMatchObject({ email: REGISTRATION.email });
    expect(await customerOf(client)).toMatchObject({
      email: REGISTRATION.email,
    });
    const again = await send(browser(), {
      method: "POST",
      path: "/api/account/register/confirm",
      body: confirmation,
    });
    expect(again.error?.data?.code).toBe("already_confirmed");
  });

  it("deletes the account", async () => {
    await setup();
    const client = await registered();
    const answer = await send(client, {
      method: "DELETE",
      path: "/api/account",
    });
    expect(answer.event.status).toBe(204);
    expect(await customerOf(client)).toBeNull();
    expect((await login(browser())).error?.statusCode).toBe(401);
  });
});
