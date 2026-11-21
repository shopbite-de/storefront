import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Store API outage breaker (step 6 review): it opens only after two
 * requests without an answer (deadline, no connection) within 15 s with
 * no answer between, and then fails requests at once for 30 s; any answer
 * closes it. Other errors never count. The order placement and its
 * follow-up look-ups bypass it and never open it.
 */
const timeout = () =>
  Object.assign(new Error("[POST] <no response> aborted due to timeout"), {
    name: "FetchError",
    cause: Object.assign(new Error("timeout"), { name: "TimeoutError" }),
  });
const refused = () =>
  Object.assign(new Error("[GET] <no response> fetch failed"), {
    name: "FetchError",
    cause: Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    }),
  });
const refusal = () =>
  Object.assign(new Error("[POST] 400"), {
    name: "FetchError",
    statusCode: 400,
  });

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function breaker() {
  return import("../../server/utils/outageBreaker");
}

const fails = (error: unknown) => () => Promise.reject(error);
const answers = () => Promise.resolve("answer");

describe("outage breaker", () => {
  it("stays closed after one request without an answer", async () => {
    const { guardedRequest } = await breaker();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
  });

  it("opens after two within 15 s and fails fast for 30 s", async () => {
    const { guardedRequest } = await breaker();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    vi.setSystemTime(new Date("2026-11-22T12:00:10Z"));
    await expect(guardedRequest(fails(refused()))).rejects.toThrow();
    const request = vi.fn(answers);
    await expect(guardedRequest(request)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(request).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-11-22T12:00:41Z"));
    await expect(guardedRequest(request)).resolves.toBe("answer");
    // closed by the answer: one more failure does not open it again
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
  });

  it("does not count failures further apart than 15 s", async () => {
    const { guardedRequest } = await breaker();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    vi.setSystemTime(new Date("2026-11-22T12:00:16Z"));
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
  });

  it("is reset by any answer between, also a refusal", async () => {
    const { guardedRequest } = await breaker();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(fails(refusal()))).rejects.toThrow();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
  });

  it("never counts errors that are no missing answer", async () => {
    const { guardedRequest } = await breaker();
    await expect(
      guardedRequest(fails(new SyntaxError("Unexpected token < in JSON"))),
    ).rejects.toThrow();
    await expect(
      guardedRequest(fails(new TypeError("x is not a function"))),
    ).rejects.toThrow();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
  });

  it("lets the order placement and its look-ups pass and never opens for them", async () => {
    const { guardedRequest, bypassOutageBreaker } = await breaker();
    // a slow order and its look-up do not open it
    await expect(
      bypassOutageBreaker(() => guardedRequest(fails(timeout()))),
    ).rejects.toThrow();
    await expect(
      bypassOutageBreaker(() => guardedRequest(fails(timeout()))),
    ).rejects.toThrow();
    await expect(guardedRequest(answers)).resolves.toBe("answer");
    // open for everybody else, the order's look-up still asks
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(fails(timeout()))).rejects.toThrow();
    await expect(guardedRequest(answers)).rejects.toMatchObject({
      statusCode: 503,
    });
    await expect(
      bypassOutageBreaker(() => guardedRequest(answers)),
    ).resolves.toBe("answer");
  });
});

describe("Store API utils behind the breaker", () => {
  it("fail fast while it is open and ask again after it", async () => {
    let down = true;
    const plain = vi.fn(async () => {
      if (down) throw timeout();
      return {};
    });
    const raw = vi.fn(async () => ({ _data: {}, headers: new Headers() }));
    vi.stubGlobal("$fetch", Object.assign(plain, { raw }));
    vi.stubGlobal("useRuntimeConfig", () => ({
      shopware: { endpoint: "" },
      public: {
        shopware: { endpoint: "http://shopware/store-api", accessToken: "k" },
      },
    }));
    const { storeApiGet, storeApiPost, storeApiForVisitor } =
      await import("../../server/utils/storeApi");
    await expect(storeApiGet("/context")).rejects.toThrow();
    await expect(storeApiPost("/product", {})).rejects.toThrow();
    expect(plain).toHaveBeenCalledTimes(2);
    await expect(
      storeApiForVisitor({ method: "POST", path: "/account/customer" }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(raw).not.toHaveBeenCalled();
    down = false;
    vi.setSystemTime(new Date("2026-11-22T12:00:31Z"));
    await expect(storeApiGet("/context")).resolves.toEqual({});
  });
});
