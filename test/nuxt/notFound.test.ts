import { describe, it, expect } from "vitest";
import { createNotFoundError } from "../../app/utils/notFound";

describe("createNotFoundError", () => {
  it("is a 404 that stays fatal in the browser, so navigation shows the error page", () => {
    const error = createNotFoundError("Page /x not found!");

    expect(error.statusCode).toBe(404);
    expect(error.statusMessage).toBe("Page /x not found!");
    // The test environment runs as client; on the server `fatal` is false.
    expect(error.fatal).toBe(import.meta.client);
  });
});
