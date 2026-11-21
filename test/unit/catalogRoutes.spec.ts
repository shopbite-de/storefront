import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../../server/ports";
import { CACHE_TTL, stubNitro, type CachedHandler } from "./nitroStubs";

/**
 * The menu behind the BFF (ADR 0001, step 2): the routes answer domain
 * types from `useBackend().catalog`, cached under keys that carry the
 * section or dish id (cache purge), DomainErrors as HTTP answers.
 */
const PIZZA = "12eb9087c8335ca9a74cc6485fa36b34";
const MARGHERITA = "ae0946785b4a53438dac2b8535eb4f9f";
const GROSS = "92cc421067ca5cee84f2c2dada01ba1a";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The memory adapter of the freshly loaded modules (`instanceof DomainError`). */
const memory = async () =>
  (await import("../../server/adapters/memory")).createMemoryBackend();

async function route(
  path: string,
  given?: Backend,
  globals: Record<string, unknown> = {},
) {
  const backend = given ?? (await memory());
  const params = await import("../../server/utils/listingParams");
  const { answerDomain } = await import("../../server/utils/domainHttp");
  stubNitro({
    ...params,
    answerDomain,
    useBackend: () => backend,
    setResponseHeader: vi.fn(),
    ...globals,
  });
  const loaded = (await import(/* @vite-ignore */ path)).default as
    CachedHandler | CachedHandler["handler"];
  return typeof loaded === "function"
    ? { handler: loaded, opts: undefined }
    : loaded;
}

const { catalog } = (
  await import("../../server/adapters/memory")
).createMemoryBackend();

describe("/api/menu/sections/[sectionId]", () => {
  it("answers the section, cached by its id", async () => {
    const { handler, opts } = await route(
      "../../server/api/menu/sections/[sectionId].get",
    );
    const event = { params: { sectionId: PIZZA.toUpperCase() } };

    expect(await handler(event)).toEqual(await catalog.getSection(PIZZA));
    expect(opts).toMatchObject({
      name: "menu-section",
      maxAge: CACHE_TTL.category,
    });
    expect(await opts!.getKey(event)).toBe(`section-${PIZZA}`);
  });

  it("answers an unknown section with 404 and the domain code", async () => {
    const { handler } = await route(
      "../../server/api/menu/sections/[sectionId].get",
    );

    await expect(
      handler({ params: { sectionId: "f".repeat(32) } }),
    ).rejects.toMatchObject({
      statusCode: 404,
      data: { code: "not_found" },
    });
  });
});

describe("/api/menu/dishes/[dishId]", () => {
  it("answers the dish sheet, cached by the dish id", async () => {
    const { handler, opts } = await route(
      "../../server/api/menu/dishes/[dishId].get",
    );
    const event = { params: { dishId: MARGHERITA } };

    expect(await handler(event)).toEqual(await catalog.getDish(MARGHERITA));
    expect(opts).toMatchObject({ name: "dish", maxAge: CACHE_TTL.product });
    expect(await opts!.getKey(event)).toBe(`dish-${MARGHERITA}`);
  });

  it("rejects an id that is no id with 400", async () => {
    const { handler } = await route(
      "../../server/api/menu/dishes/[dishId].get",
    );

    await expect(
      handler({ params: { dishId: "../../etc" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("/api/menu/dishes/[dishId]/variant", () => {
  it("answers the variant with the options, keyed by dish and sorted options", async () => {
    const { handler, opts } = await route(
      "../../server/api/menu/dishes/[dishId]/variant.get",
    );
    const event = { params: { dishId: MARGHERITA }, query: { options: GROSS } };

    expect(await handler(event)).toMatchObject({ number: "SB-21-groß" });
    expect(opts).toMatchObject({ name: "variant", maxAge: CACHE_TTL.variant });
    expect(
      await opts!.getKey({ ...event, query: { options: `b|${GROSS}|b` } }),
    ).toBe(`v2-variant-${MARGHERITA}-${GROSS}|b`);
  });

  it("needs at least one option", async () => {
    const { handler } = await route(
      "../../server/api/menu/dishes/[dishId]/variant.get",
    );

    await expect(
      handler({ params: { dishId: MARGHERITA }, query: {} }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("/api/menu/dishes?number=", () => {
  it("answers a variant's number with its dish, that variant selected", async () => {
    const { handler, opts } = await route(
      "../../server/api/menu/dishes/index.get",
    );
    const event = { query: { number: "SB-21-groß" } };

    expect(await handler(event)).toMatchObject({
      id: MARGHERITA,
      selectedVariantId: expect.any(String),
    });
    expect(opts).toMatchObject({ name: "dish-number" });
    expect(await opts!.getKey(event)).toBe("number-SB-21-groß");
  });

  it("answers an unknown number with 404, which is not cached", async () => {
    const { handler } = await route("../../server/api/menu/dishes/index.get");

    await expect(
      handler({ query: { number: "SB-999" } }),
    ).rejects.toMatchObject({
      statusCode: 404,
      data: { code: "not_found" },
    });
    await expect(
      handler({ query: { number: "x".repeat(65) } }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("/api/top-sellers and /api/menu/upsell", () => {
  it("answer the port's dishes", async () => {
    const top = await route("../../server/api/top-sellers.get");
    expect(await top.handler({})).toEqual(await catalog.listTopSellers(8));
    expect(top.opts).toMatchObject({
      name: "top-sellers",
      maxAge: CACHE_TTL.listing,
    });

    const upsell = await route("../../server/api/menu/upsell.get");
    expect(await upsell.handler({})).toEqual(await catalog.listUpsellDishes(6));
    expect(upsell.opts).toMatchObject({
      name: "upsell",
      maxAge: CACHE_TTL.listing,
    });
  });

  it("serve the last good top sellers during an outage", async () => {
    const backend = await memory();
    const { DomainError } = await import("../../shared/domain");
    const listTopSellers = vi
      .fn()
      .mockResolvedValueOnce([{ id: "a" }])
      .mockRejectedValue(new DomainError("backend_unavailable", "down"));
    const { handler } = await route("../../server/api/top-sellers.get", {
      ...backend,
      catalog: { ...backend.catalog, listTopSellers },
    });

    expect(await handler({})).toEqual([{ id: "a" }]);
    expect(await handler({})).toEqual([{ id: "a" }]);
  });

  it("ask a failing backend once per pause", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const backend = await memory();
      const { DomainError } = await import("../../shared/domain");
      const listTopSellers = vi
        .fn()
        .mockRejectedValue(new DomainError("backend_unavailable", "down"));
      const { handler } = await route("../../server/api/top-sellers.get", {
        ...backend,
        catalog: { ...backend.catalog, listTopSellers },
      });

      for (let i = 0; i < 3; i++) {
        // paused or failing: the same answer as every BFF route
        await expect(handler({})).rejects.toMatchObject({
          statusCode: 503,
          data: { code: "backend_unavailable" },
        });
      }
      expect(listTopSellers).toHaveBeenCalledTimes(1);
      vi.setSystemTime(31_000);
      await expect(handler({})).rejects.toThrow();
      expect(listTopSellers).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("/api/listing/[sectionId]", () => {
  it("answers the section's listing", async () => {
    const { handler } = await route("../../server/api/listing/[sectionId].get");

    expect(
      await handler({
        params: { sectionId: PIZZA },
        query: { order: "price-desc" },
      }),
    ).toEqual(await catalog.listDishes(PIZZA, { sorting: "price-desc" }));
  });

  it("answers an unknown section with 404", async () => {
    const { handler } = await route("../../server/api/listing/[sectionId].get");

    await expect(
      handler({ params: { sectionId: "f".repeat(32) }, query: {} }),
    ).rejects.toMatchObject({ statusCode: 404, data: { code: "not_found" } });
  });
});

describe("/api/menu/media/[name]", () => {
  const runtime = (backend: string) => () => ({
    shopBite: { backend },
    public: { shopBite: { cacheTtl: CACHE_TTL } },
  });

  it("serves the demo menu's photos on the memory adapter only", async () => {
    const memory = await route(
      "../../server/api/menu/media/[name].get",
      undefined,
      {
        useRuntimeConfig: runtime("memory"),
      },
    );
    const image = (await memory.handler({
      params: { name: "21.webp" },
    })) as Buffer;
    expect(image.subarray(8, 12).toString()).toBe("WEBP");
    await expect(
      memory.handler({ params: { name: "1.webp" } }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });

    const shopware = await route(
      "../../server/api/menu/media/[name].get",
      undefined,
      {
        useRuntimeConfig: runtime("shopware"),
      },
    );
    await expect(
      shopware.handler({ params: { name: "21.webp" } }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
