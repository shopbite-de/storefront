import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubNitro } from "./nitroStubs";

/** The module instance the freshly loaded mapper sees. */
let domain: typeof import("../../shared/domain");

beforeEach(async () => {
  vi.resetModules();
  stubNitro();
  domain = await import("../../shared/domain");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const load = () => import("../../server/utils/domainHttp");

describe("DomainError → HTTP (BFF routes)", () => {
  it("has an HTTP status for every domain error code", async () => {
    const { DOMAIN_ERROR_STATUS } = await load();
    for (const code of domain.DOMAIN_ERROR_CODES) {
      expect(DOMAIN_ERROR_STATUS[code], code).toBeGreaterThanOrEqual(400);
    }
  });

  it("answers the code, never the backend's message or cause", async () => {
    const { toHttpError } = await load();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = toHttpError(
      new domain.DomainError(
        "backend_unavailable",
        "Shopware did not answer /shopbite/config.",
        {},
        { cause: new Error("secret upstream detail") },
      ),
    ) as Error & { statusCode: number; data: unknown };
    expect(error.statusCode).toBe(503);
    expect(error.data).toEqual({ code: "backend_unavailable" });
    expect(error.message).not.toMatch(/Shopware|upstream/);
  });

  it("maps the codes a guest can act on", async () => {
    const { DOMAIN_ERROR_STATUS } = await load();
    expect(DOMAIN_ERROR_STATUS).toMatchObject({
      not_found: 404,
      not_implemented: 501,
      backend_unavailable: 503,
      invalid_value: 400,
      validation_failed: 422,
      unauthenticated: 401,
      ordering_closed: 409,
    });
  });

  it("passes other errors through unchanged", async () => {
    const { toHttpError } = await load();
    const outage = Object.assign(new Error("Shopware unavailable"), {
      statusCode: 503,
    });
    expect(toHttpError(outage)).toBe(outage);
  });

  it("wraps a route's answer", async () => {
    const { answerDomain } = await load();
    expect(await answerDomain(async () => 42)).toBe(42);
    await expect(
      answerDomain(() =>
        Promise.reject(new domain.DomainError("not_found", "no such section")),
      ),
    ).rejects.toMatchObject({ statusCode: 404, data: { code: "not_found" } });
  });
});
