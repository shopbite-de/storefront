import { describe, expect, it, vi } from "vitest";
import { createBackoff } from "../../server/utils/backoff";

describe("createBackoff", () => {
  it("is active for the given time after a failure", () => {
    const now = vi.fn(() => 1000);
    const backoff = createBackoff(30_000, now);
    expect(backoff.active()).toBe(false);
    backoff.trip();
    now.mockReturnValue(30_999);
    expect(backoff.active()).toBe(true);
    now.mockReturnValue(31_000);
    expect(backoff.active()).toBe(false);
  });
});

describe("isOutage", () => {
  it("counts fetch errors without a response and 5xx, not bugs or 4xx", async () => {
    const { isOutage } = await import("../../server/utils/backoff");
    const fetchError = (status?: number) =>
      Object.assign(new Error("[GET] fetch failed"), {
        name: "FetchError",
        ...(status ? { status, statusCode: status } : {}),
      });

    expect(isOutage(fetchError())).toBe(true);
    expect(isOutage(fetchError(503))).toBe(true);
    expect(isOutage(fetchError(404))).toBe(false);
    expect(isOutage(new TypeError("x is undefined"))).toBe(false);
  });
});

describe("createResilientLoader", () => {
  it("answers the pause without a last good answer as backend_unavailable", async () => {
    const { createResilientLoader } =
      await import("../../server/utils/backoff");
    const { isDomainError } = await import("../../shared/domain");
    const load = createResilientLoader<string>();
    const down = Object.assign(new Error("down"), { name: "FetchError" });
    const first = await load("k", () => Promise.reject(down)).catch((e) => e);
    const second = await load("k", async () => "never").catch((e) => e);
    for (const error of [first, second]) {
      expect(isDomainError(error, "backend_unavailable")).toBe(true);
    }
    expect((first as Error).cause).toBe(down);
  });
});
