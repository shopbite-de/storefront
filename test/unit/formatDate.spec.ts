import { afterEach, describe, expect, it } from "vitest";
import { formatDate } from "../../app/utils/formatDate";

/**
 * An order's time on the order pages: in the restaurant's time zone and
 * the shop's language, whatever the visitor's (or the server's) clock is
 * set to, so the server's HTML and the browser's render agree.
 */
const original = process.env.TZ;
afterEach(() => {
  process.env.TZ = original;
});

// 23:30 UTC on 1 March is already 2 March in Berlin
const placedAt = "2026-03-01T23:30:00.000Z";

describe("formatDate", () => {
  it("formats in the restaurant's time zone, not the visitor's", () => {
    for (const visitor of ["America/Los_Angeles", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = visitor;
      expect(formatDate(placedAt, "de-DE", "Europe/Berlin")).toBe(
        "02.03.2026, 00:30",
      );
    }
  });

  it("follows the restaurant's zone and the shop's language", () => {
    process.env.TZ = "Europe/Berlin";
    expect(formatDate(placedAt, "en-GB", "America/New_York")).toBe(
      "01/03/2026, 18:30",
    );
  });

  it("is empty without a date", () => {
    expect(formatDate(undefined, "de-DE", "Europe/Berlin")).toBe("");
  });
});
