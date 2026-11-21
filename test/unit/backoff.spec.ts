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
