import { describe, expect, it } from "vitest";
import {
  BACKEND_NAMES,
  createBackend,
  isBackendName,
} from "../../../server/adapters/registry";
import type { StoreApi } from "../../../server/adapters/shopware";
import { isDomainError } from "../../../shared/domain";

const storeApi: StoreApi = {
  get: () => Promise.reject(new Error("offline")),
  post: () => Promise.reject(new Error("offline")),
};

describe("adapter registry", () => {
  it("knows the shopware and memory adapters", () => {
    expect(BACKEND_NAMES).toEqual(["shopware", "memory"]);
    expect(isBackendName("shopware")).toBe(true);
    expect(isBackendName("sylius")).toBe(false);
  });

  it("creates the selected adapter with every port", () => {
    for (const name of BACKEND_NAMES) {
      const backend = createBackend(name, { storeApi, storeUrl: "" });
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

  it("rejects an unknown adapter name with the valid ones", () => {
    expect(() =>
      createBackend("sylius", { storeApi, storeUrl: "" }),
    ).toThrowError(/shopBite\.backend.*"sylius".*shopware, memory/);
  });

  it("answers not_implemented for ports an adapter does not have yet", async () => {
    const backend = createBackend("memory", { storeApi, storeUrl: "" });
    const failure = await backend.catalog.getMenu().catch((error) => error);
    expect(isDomainError(failure, "not_implemented")).toBe(true);
    expect(failure.message).toBe(
      'CatalogPort.getMenu is not implemented by the "memory" adapter yet.',
    );
  });
});
