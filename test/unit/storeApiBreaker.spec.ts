import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * While Shopware does not answer (step 6 review): after a request ran
 * into its deadline or found no connection, further Store API requests of
 * the process fail at once for 30 s, so a rendered page waits for one
 * deadline, not one per read.
 */
const timeout = () =>
  Object.assign(new Error("[GET] timeout"), { name: "FetchError" });

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup(fail: () => Error | undefined) {
  const raw = vi.fn(async () => {
    const error = fail();
    if (error) throw error;
    return { _data: {}, headers: new Headers() };
  });
  const plain = vi.fn(async () => {
    const error = fail();
    if (error) throw error;
    return {};
  });
  vi.stubGlobal("$fetch", Object.assign(plain, { raw }));
  vi.stubGlobal("useRuntimeConfig", () => ({
    shopware: { endpoint: "" },
    public: {
      shopware: { endpoint: "http://shopware/store-api", accessToken: "k" },
    },
  }));
  return { raw, plain, ...(await import("../../server/utils/storeApi")) };
}

describe("Store API outage breaker", () => {
  it("fails further reads at once for 30 s after a deadline", async () => {
    let down = true;
    const { raw, plain, storeApiGet, storeApiPost, storeApiForVisitor } =
      await setup(() => (down ? timeout() : undefined));
    await expect(storeApiGet("/context")).rejects.toThrow();
    expect(plain).toHaveBeenCalledTimes(1);

    await expect(storeApiPost("/product", {})).rejects.toMatchObject({
      statusCode: 503,
    });
    await expect(
      storeApiForVisitor({ method: "POST", path: "/account/customer" }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(plain).toHaveBeenCalledTimes(1);
    expect(raw).not.toHaveBeenCalled();

    down = false;
    vi.setSystemTime(new Date("2026-11-22T12:00:31Z"));
    await expect(storeApiGet("/context")).resolves.toEqual({});
    expect(plain).toHaveBeenCalledTimes(2);
  });

  it("is not opened by an answer of Shopware (a refusal)", async () => {
    const refusal = Object.assign(new Error("400"), { statusCode: 400 });
    let calls = 0;
    const { plain, storeApiPost } = await setup(() =>
      ++calls === 1 ? refusal : undefined,
    );
    await expect(storeApiPost("/account/login", {})).rejects.toBe(refusal);
    await expect(storeApiPost("/account/login", {})).resolves.toEqual({});
    expect(plain).toHaveBeenCalledTimes(2);
  });
});
