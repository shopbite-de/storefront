import { describe, expect, it, vi } from "vitest";
import {
  forwardedFor,
  forwardStoreApiRequest,
  type StoreApiSend,
} from "../../../server/adapters/shopware/sessionBridge";
import type { BackendSession } from "../../../server/ports";

/**
 * Until checkout (step 5), account (6) and wishlist/contact (7) move behind
 * their ports, the browser's Shopware layer reaches the Store API through
 * the storefront: the context token is added on the server from the
 * session and never reaches the browser.
 */
function session(initial?: string) {
  let state = initial;
  const writes: (string | undefined)[] = [];
  const backend: BackendSession = {
    read: async () => state,
    write: async (next) => {
      writes.push(next);
      state = next;
    },
  };
  return { backend, writes, current: () => state };
}

function answer(
  body: unknown,
  init: { status?: number; token?: string; contentType?: string } = {},
) {
  const headers = new Headers({
    "content-type": init.contentType ?? "application/json",
  });
  if (init.token) headers.set("sw-context-token", init.token);
  const bytes =
    body instanceof Uint8Array
      ? body
      : new TextEncoder().encode(JSON.stringify(body));
  return { status: init.status ?? 200, headers, body: bytes };
}

const ENDPOINT = "http://shopware:8000/store-api";

function forward(
  request: Partial<Parameters<typeof forwardStoreApiRequest>[0]>,
  options: { session: BackendSession; send: StoreApiSend },
) {
  return forwardStoreApiRequest(
    {
      method: "POST",
      path: "context",
      search: "",
      headers: {},
      body: undefined,
      forwardedFor: "203.0.113.7",
      ...request,
    },
    {
      endpoint: ENDPOINT,
      accessKey: "SWSC-KEY",
      session: options.session,
      send: options.send,
    },
  );
}

const json = (bytes: Uint8Array | null) =>
  JSON.parse(new TextDecoder().decode(bytes ?? new Uint8Array()));

describe("forwardedFor", () => {
  it("appends the address the request came from to the chain it brought", () => {
    // a forged entry stays on the left, where a proxy-aware Shopware
    // does not look once it trusts the storefront and the proxies before it
    expect(forwardedFor("1.2.3.4, 203.0.113.7", "10.0.0.5")).toBe(
      "1.2.3.4, 203.0.113.7, 10.0.0.5",
    );
    expect(forwardedFor(undefined, "10.0.0.5")).toBe("10.0.0.5");
    expect(forwardedFor(" , ", "::ffff:10.0.0.5")).toBe("::ffff:10.0.0.5");
  });

  it("sends nothing without the socket address", () => {
    expect(forwardedFor("1.2.3.4", undefined)).toBeUndefined();
  });

  it("bounds the chain", () => {
    const long = Array.from({ length: 40 }, (_, i) => `10.0.0.${i}`).join(",");
    expect(forwardedFor(long, "10.1.1.1")!.split(", ")).toHaveLength(20);
    expect(forwardedFor(long, "10.1.1.1")!.endsWith("10.1.1.1")).toBe(true);
  });
});

describe("Store API bridge of the Shopware layer", () => {
  it("adds access key and the session's token, drops the browser's", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () => answer({ ok: true }));

    await forward(
      {
        method: "PATCH",
        path: "context",
        search: "?a=1",
        headers: {
          "content-type": "application/json",
          "sw-context-token": "planted-by-a-script",
          "sw-access-key": "other",
          cookie: "shopbite-session=abc",
          "sw-language-id": "lang",
          authorization: "Bearer x",
        },
        body: new TextEncoder().encode('{"shippingMethodId":"x"}'),
      },
      { session: visitor.backend, send },
    );

    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe(`${ENDPOINT}/context?a=1`);
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "sw-language-id": "lang",
      "sw-access-key": "SWSC-KEY",
      "sw-context-token": "token-1",
      "x-forwarded-for": "203.0.113.7",
    });
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe(
      '{"shippingMethodId":"x"}',
    );
  });

  it("sends no token for a visitor without a session", async () => {
    const visitor = session();
    const send = vi.fn<StoreApiSend>(async () => answer({}));

    await forward({}, { session: visitor.backend, send });

    expect(send.mock.calls[0]![1].headers).not.toHaveProperty(
      "sw-context-token",
    );
  });

  it("keeps a new or rotated token in the session and never answers it", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () =>
      answer(
        {
          contextToken: "token-2",
          token: "token-2",
          customer: { email: "a@example.com", token: "not-a-context-token" },
          nested: [{ value: "token-1" }, "token-2"],
        },
        { token: "token-2" },
      ),
    );

    const result = await forward(
      { path: "account/login" },
      { session: visitor.backend, send },
    );

    expect(visitor.writes).toEqual(["token-2"]);
    expect(result.headers).not.toHaveProperty("sw-context-token");
    const body = json(result.body);
    expect(body).toEqual({
      customer: { email: "a@example.com", token: "not-a-context-token" },
      nested: [{}, ""],
    });
    expect(new TextDecoder().decode(result.body!)).not.toMatch(/token-[12]/);
  });

  it("does not write the token the session holds already", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () =>
      answer({ token: "token-1" }, { token: "token-1" }),
    );

    await forward(
      { path: "checkout/cart", method: "GET" },
      {
        session: visitor.backend,
        send,
      },
    );

    expect(visitor.writes).toEqual([]);
  });

  it("passes Shopware's errors on with their status", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () =>
      answer(
        {
          errors: [
            { status: "401", code: "CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS" },
          ],
        },
        { status: 401 },
      ),
    );

    const result = await forward(
      { path: "account/login" },
      { session: visitor.backend, send },
    );

    expect(result.status).toBe(401);
    expect(json(result.body).errors[0].code).toBe(
      "CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS",
    );
  });

  it("removes the token from Shopware's error texts, parameters and keys", async () => {
    const token = "PhqKLd6O3YbAz2CVYjRcTi0Ru2uQMwuw";
    const visitor = session(token);
    const answers = [
      answer(
        {
          errors: [
            {
              status: "409",
              code: "CHECKOUT__CART_LOCKED",
              title: "Conflict",
              detail: `Cart with token ${token} is locked due to concurrent write operation`,
              meta: { parameters: { token } },
            },
          ],
        },
        { status: 409 },
      ),
      answer(
        {
          errors: [
            {
              status: "404",
              code: "CHECKOUT__CART_TOKEN_NOT_FOUND",
              detail: `Cart with token ${token} not found`,
              meta: { parameters: { token } },
            },
          ],
        },
        { status: 404 },
      ),
      answer({
        errors: {
          [`content-hash-${token}`]: {
            message: `Content hash mismatch for cart ${token}.`,
          },
        },
      }),
    ];
    const send = vi.fn<StoreApiSend>(async () => answers.shift()!);

    for (let i = 0; i < 3; i++) {
      const result = await forward(
        { path: "checkout/cart/line-item" },
        { session: visitor.backend, send },
      );
      const text = new TextDecoder().decode(result.body!);
      expect(text).not.toContain(token);
      expect(() => JSON.parse(text)).not.toThrow();
    }
  });

  it("removes the token and the internal endpoint from a text answer", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () =>
      answer(
        new TextEncoder().encode(
          'No route found for "POST http://shopware:8000/store-api/nope" (token-1)',
        ),
        { status: 404, contentType: "text/html; charset=UTF-8" },
      ),
    );

    const result = await forward(
      { path: "nope" },
      { session: visitor.backend, send },
    );

    const text = new TextDecoder().decode(result.body!);
    expect(text).not.toContain("token-1");
    expect(text).not.toContain("shopware:8000");
  });

  it("removes the internal endpoint from JSON error texts", async () => {
    const visitor = session();
    const send = vi.fn<StoreApiSend>(async () =>
      answer(
        {
          errors: [
            {
              status: "405",
              detail:
                'No route found for "PUT http://shopware:8000/store-api/context": Method Not Allowed',
            },
          ],
        },
        { status: 405 },
      ),
    );

    const result = await forward(
      { method: "PUT" },
      { session: visitor.backend, send },
    );

    expect(json(result.body).errors[0].detail).toBe(
      'No route found for "PUT /store-api/context": Method Not Allowed',
    );
  });

  it("redacts an answer without a content type as text", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () => ({
      status: 500,
      headers: new Headers(),
      body: new TextEncoder().encode("Cart with token token-1 failed"),
    }));

    const result = await forward({}, { session: visitor.backend, send });

    expect(new TextDecoder().decode(result.body!)).toBe(
      "Cart with token *** failed",
    );
  });

  it("gives up on a Shopware that does not answer: 503 within the deadline, request aborted", async () => {
    const visitor = session("token-1");
    let signal: AbortSignal | undefined;
    const send = vi.fn<StoreApiSend>(
      (_url, init) =>
        new Promise((_, reject) => {
          signal = init.signal;
          init.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const started = Date.now();

    const result = await forwardStoreApiRequest(
      {
        method: "POST",
        path: "account/login",
        search: "",
        headers: {},
        body: undefined,
        forwardedFor: undefined,
      },
      {
        endpoint: ENDPOINT,
        accessKey: "SWSC-KEY",
        session: visitor.backend,
        send,
        timeoutMs: 30,
      },
    );

    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.status).toBe(503);
    expect(json(result.body).errors[0].code).toBe("backend_unavailable");
    expect(signal?.aborted).toBe(true);
  });

  it("redacts an octet-stream answer unless it is a known binary file", async () => {
    const visitor = session("token-1");
    const answers = [
      answer(new TextEncoder().encode("token token-1 here"), {
        contentType: "application/octet-stream",
      }),
      answer(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), {
        contentType: "application/octet-stream",
      }),
    ];
    const send = vi.fn<StoreApiSend>(async () => answers.shift()!);

    const text = await forward(
      { method: "GET" },
      { session: visitor.backend, send },
    );
    expect(new TextDecoder().decode(text.body!)).toBe("token *** here");
    const pdf = await forward(
      { method: "GET" },
      { session: visitor.backend, send },
    );
    expect(pdf.body).toEqual(
      new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
    );
  });

  it("passes other content (a document download) through unchanged", async () => {
    const visitor = session("token-1");
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const send = vi.fn<StoreApiSend>(async () => {
      const result = answer(pdf, { contentType: "application/pdf" });
      result.headers.set(
        "content-disposition",
        'attachment; filename="invoice.pdf"',
      );
      return result;
    });

    const result = await forward(
      { method: "GET", path: "document/download/abc/def" },
      { session: visitor.backend, send },
    );

    expect(result.body).toEqual(pdf);
    expect(result.headers).toEqual({
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="invoice.pdf"',
    });
  });

  it("answers a backend that does not answer with 503 and the domain code", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () => {
      throw new Error("ECONNREFUSED");
    });

    const result = await forward({}, { session: visitor.backend, send });

    expect(result.status).toBe(503);
    expect(json(result.body)).toEqual({
      errors: [{ status: "503", code: "backend_unavailable" }],
    });
  });

  it("refuses paths outside the Store API and unknown methods", async () => {
    const visitor = session("token-1");
    const send = vi.fn<StoreApiSend>(async () => answer({}));

    for (const path of [
      "../api/oauth/token",
      "checkout/../../admin",
      "",
      "/context",
      "a//b",
      "x".repeat(300),
      "context%2F..",
    ]) {
      expect(
        (await forward({ path }, { session: visitor.backend, send })).status,
      ).toBe(404);
    }
    expect(
      (await forward({ method: "TRACE" }, { session: visitor.backend, send }))
        .status,
    ).toBe(405);
    expect(send).not.toHaveBeenCalled();
  });
});
