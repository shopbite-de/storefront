import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryBackend } from "../../server/adapters/memory";
import { stubNitro, type CachedHandler } from "./nitroStubs";

/**
 * Handlers that answer domain types under the name a handler with
 * Shopware's shapes had before (ADR 0001, steps 2 and 3) carry a version
 * in their key: a shop with persistent cache storage must not serve an
 * old Shopware shape to the new app for the rest of its TTL.
 */
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

const PIZZA = "12eb9087c8335ca9a74cc6485fa36b34";

const ROUTES: [string, Record<string, unknown>][] = [
  ["../../server/api/navigation/[kind].get", { params: { kind: "main" } }],
  [
    "../../server/api/breadcrumb/[sectionId].get",
    { params: { sectionId: PIZZA } },
  ],
  [
    "../../server/api/listing/[sectionId].get",
    { params: { sectionId: PIZZA } },
  ],
  ["../../server/api/search.get", { query: { query: "pizza" } }],
  ["../../server/api/top-sellers.get", {}],
  [
    "../../server/api/menu/dishes/[dishId]/variant.get",
    { params: { dishId: PIZZA }, query: { options: PIZZA } },
  ],
];

describe("cache keys of handlers whose answers changed shape", () => {
  for (const [path, event] of ROUTES) {
    it(`are versioned: ${path.split("/api/")[1]}`, async () => {
      const params = await import("../../server/utils/listingParams");
      stubNitro({ ...params, useBackend: () => createMemoryBackend() });
      const { opts } = (await import(/* @vite-ignore */ path))
        .default as CachedHandler;
      expect(await opts.getKey(event)).toMatch(/^v2-/);
    });
  }
});
