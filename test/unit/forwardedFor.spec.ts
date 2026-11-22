import { describe, expect, it } from "vitest";
import { forwardedFor } from "../../server/session/forwardedFor";

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
