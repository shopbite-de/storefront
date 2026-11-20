import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notImplemented } from "../../../server/adapters/notImplemented";
import {
  BACKEND_NAMES,
  createBackend,
  isBackendName,
  type BackendRuntimeConfig,
} from "../../../server/adapters/registry";
import { DomainError, isDomainError } from "../../../shared/domain";

const config = (backend: string): BackendRuntimeConfig => ({
  shopBite: { backend, timeZone: "Europe/Berlin" },
  public: { storeUrl: "https://shop.example.com" },
});

beforeEach(() => {
  vi.stubGlobal("storeApiGet", vi.fn().mockRejectedValue(new Error("offline")));
  vi.stubGlobal(
    "storeApiPost",
    vi.fn().mockRejectedValue(new Error("offline")),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adapter registry", () => {
  it("knows the shopware and memory adapters", () => {
    expect(BACKEND_NAMES).toEqual(["shopware", "memory"]);
    expect(isBackendName("shopware")).toBe(true);
    expect(isBackendName("sylius")).toBe(false);
  });

  it("creates the selected adapter with every port", () => {
    for (const name of BACKEND_NAMES) {
      const backend = createBackend(config(name));
      expect(backend.name).toBe(name);
      for (const port of [
        "catalog",
        "navigation",
        "cart",
        "checkout",
        "customer",
        "orders",
        "shop",
        "wishlist",
        "contact",
      ] as const) {
        expect(backend[port], port).toBeDefined();
      }
    }
  });

  it("lets each adapter read its own configuration", async () => {
    const shopware = createBackend(config("shopware"));
    await shopware.shop.getConfig().catch(() => undefined);
    expect(storeApiGet).toHaveBeenCalledWith("/shopbite/config", undefined);

    const memory = createBackend({
      ...config("memory"),
      shopBite: { backend: "memory", timeZone: "Europe/Vienna" },
    });
    expect((await memory.shop.getConfig()).timeZone).toBe("Europe/Vienna");
  });

  it("rejects an unknown adapter name with the valid ones", () => {
    expect(() => createBackend(config("sylius"))).toThrowError(
      /shopBite\.backend.*"sylius".*shopware, memory/,
    );
  });
});

describe("a port not implemented yet", () => {
  const port = notImplemented("catalog", "memory");

  it("rejects every method with not_implemented", async () => {
    const failure = await port.getMenu().catch((error) => error);
    expect(isDomainError(failure, "not_implemented")).toBe(true);
    expect(failure.message).toBe(
      'CatalogPort.getMenu is not implemented by the "memory" adapter yet.',
    );
  });

  it("is no thenable and serialises and prints like an object", async () => {
    expect(await port).toBe(port);
    expect(JSON.stringify(port)).toBe("{}");
    expect(String(port)).toBe("[object Object]");
    expect(`${port.valueOf() === port}`).toBe("true");
    expect((port as never)[Symbol.toPrimitive]).toBeUndefined();
  });
});

describe("DomainError", () => {
  it("keeps the cause", () => {
    const cause = new Error("socket hang up");
    const error = new DomainError("backend_unavailable", "down", {}, { cause });
    expect(error.cause).toBe(cause);
  });
});
