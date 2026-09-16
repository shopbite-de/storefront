import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withRetries } from "../../app/utils/retry";

describe("withRetries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the first successful result without waiting", async () => {
    const request = vi.fn().mockResolvedValue("ok");

    await expect(withRetries(request, [1000, 3000])).resolves.toBe("ok");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("tries again after each delay until a request succeeds", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValue("ok");

    const result = withRetries(request, [1000, 3000]);

    await vi.advanceTimersByTimeAsync(999);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(result).resolves.toBe("ok");
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("throws the error of the last attempt", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("last"));

    const result = withRetries(request, [1000]);
    const assertion = expect(result).rejects.toThrow("last");

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry without delays", async () => {
    const request = vi.fn().mockRejectedValue(new Error("down"));

    await expect(withRetries(request, [])).rejects.toThrow("down");
    expect(request).toHaveBeenCalledTimes(1);
  });
});
