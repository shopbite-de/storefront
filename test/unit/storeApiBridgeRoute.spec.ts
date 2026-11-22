import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubNitro } from "./nitroStubs";

/**
 * `/api/store-api/**` (ADR 0001, step 4): the Shopware layer's requests
 * with the visitor's token from the sealed session. Writes of one visitor
 * run one after the other with the cart's writes: one that waited behind a
 * write that replaced the token (registration, login) answers 409
 * `stale_session` instead of acting on the replaced token.
 */
type Cookie = { name: string; value: string };

function browser(initial: Record<string, string> = {}) {
  return { cookies: new Map(Object.entries(initial)) };
}
type Browser = ReturnType<typeof browser>;

type Request = {
  method: string;
  path: string;
  body?: string;
  headers?: Record<string, string>;
};

function eventOf(client: Browser, request: Request) {
  const req = Object.assign(
    Readable.from(request.body ? [Buffer.from(request.body)] : []),
    { socket: { remoteAddress: "10.0.0.5" } },
  );
  return {
    method: request.method,
    path: request.path,
    context: {} as Record<string, unknown>,
    node: { req },
    headers: {
      host: "localhost:3000",
      ...(request.method === "GET" ? {} : { origin: "http://localhost:3000" }),
      "content-type": "application/json",
      ...request.headers,
    } as Record<string, string | undefined>,
    client,
    setCookies: [] as Cookie[],
    status: 200,
  };
}
type TestEvent = ReturnType<typeof eventOf>;

const PASSWORD = "bridge-test-session-password-0123456789";

let fetchMock: ReturnType<typeof vi.fn>;

async function setup(config: { allowedOrigins?: string } = {}) {
  const session = await import("../../server/utils/visitorSession");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  stubNitro({
    ...session,
    useRuntimeConfig: () => ({
      public: {
        storeUrl: "https://shop.example.com",
        shopware: { endpoint: "http://shopware/store-api", accessToken: "k" },
      },
      shopware: { endpoint: "" },
      visitorSession: {
        maxAgeDays: 30,
        password: PASSWORD,
        previousPasswords: "",
        allowedOrigins: config.allowedOrigins ?? "",
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
    getRequestHeaders: (event: TestEvent) => event.headers,
    getRequestURL: (event: TestEvent) =>
      new URL(`http://localhost:3000${event.path}`),
    getRouterParam: (event: TestEvent) =>
      event.path.replace(/^\/api\/store-api\//, ""),
    setResponseStatus: (event: TestEvent, status: number) => {
      event.status = status;
    },
    setResponseHeader: () => {},
  });
}

/** Shopware's answer, optionally late and with a new token. */
function answer(token: string, delayMs = 0) {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "sw-context-token": token,
      },
    });
  };
}

async function send(client: Browser, request: Request) {
  const handler = (await import("../../server/api/store-api/[...path]"))
    .default as unknown as (event: TestEvent) => Promise<unknown>;
  const event = eventOf(client, request);
  try {
    const body = await handler(event);
    return { event, body, error: undefined };
  } catch (error) {
    return {
      event,
      body: undefined,
      error: error as { statusCode: number; data?: { code?: string } },
    };
  }
}

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/api/store-api/**", () => {
  it("runs a visitor's writes one after the other; one behind a token change answers 409", async () => {
    await setup();
    const client = browser();
    fetchMock.mockImplementationOnce(answer("token-1"));
    await send(client, {
      method: "POST",
      path: "/api/store-api/shopbite/wishlist",
      body: "{}",
    });
    const cookie = client.cookies.get("__Host-shopbite-session")!;
    expect(cookie).toMatch(/^v1\./);

    // a slow write during which Shopware replaces the token
    fetchMock.mockImplementationOnce(answer("token-registered", 30));
    const tab1 = browser({ "__Host-shopbite-session": cookie });
    const tab2 = browser({ "__Host-shopbite-session": cookie });
    const [register, other] = await Promise.all([
      send(tab1, {
        method: "POST",
        path: "/api/store-api/shopbite/wishlist/merge",
        body: "{}",
      }),
      send(tab2, {
        method: "POST",
        path: "/api/store-api/contact-form",
        body: "{}",
      }),
    ]);

    expect(register.event.status).toBe(200);
    expect(register.event.setCookies).toHaveLength(1);
    expect(other.event.status).toBe(409);
    expect(other.body).toEqual({
      errors: [{ status: "409", code: "stale_session" }],
    });
    expect(other.event.setCookies).toEqual([]);
    // the second write never reached Shopware
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lets a visitor's reads run in parallel", async () => {
    await setup();
    const client = browser();
    fetchMock.mockImplementationOnce(answer("token-1"));
    await send(client, {
      method: "POST",
      path: "/api/store-api/shopbite/wishlist",
      body: "{}",
    });
    let running = 0;
    let most = 0;
    fetchMock.mockImplementation(async () => {
      running++;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running--;
      return new Response("{}", { headers: { "sw-context-token": "token-1" } });
    });

    await Promise.all(
      Array.from({ length: 3 }, () =>
        send(browser(Object.fromEntries(client.cookies)), {
          method: "GET",
          path: "/api/store-api/context",
        }),
      ),
    );
    expect(most).toBe(3);
  });

  it("accepts writes from the configured origins of the shop (several https hosts)", async () => {
    await setup({
      allowedOrigins: "https://www.shop.example.com, https://shop.example.net",
    });
    fetchMock.mockImplementation(answer("token-1"));
    for (const origin of [
      "https://www.shop.example.com",
      "https://shop.example.com",
    ]) {
      const { error } = await send(browser(), {
        method: "POST",
        path: "/api/store-api/shopbite/wishlist",
        body: "{}",
        headers: { origin },
      });
      expect(error, origin).toBeUndefined();
    }
    const { error } = await send(browser(), {
      method: "POST",
      path: "/api/store-api/shopbite/wishlist",
      body: "{}",
      headers: { origin: "https://evil.example" },
    });
    expect(error).toMatchObject({ statusCode: 403 });
  });
});
