import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../../server/adapters/shopware";
import {
  toDish,
  toDishPath,
  toExtraGroups,
  toMedia,
  toSections,
} from "../../../server/adapters/shopware/catalog";
import { isDomainError, money } from "../../../shared/domain";

/**
 * What Shopware sends that the domain cannot express, and what the adapter
 * asks for (the contract suite covers the domain behaviour).
 */
function catalogOf(
  answer: (path: string, body: Record<string, unknown>) => unknown,
  options: {
    menuCategoryId?: string;
    currency?: string;
    log?: (message: string, details: unknown) => void;
  } = {},
) {
  const post = vi.fn(async (path: string, body: Record<string, unknown>) =>
    answer(path, body),
  );
  const get = vi.fn(async (path: string) =>
    path === "/context"
      ? { currency: { isoCode: options.currency ?? "EUR" } }
      : { menuCategoryId: "plugin-root" },
  );
  const storeApi: StoreApi = {
    get: get as StoreApi["get"],
    post: post as StoreApi["post"],
  };
  const { catalog } = createShopwareBackend({
    storeApi,
    storeUrl: "",
    timeZone: "Europe/Berlin",
    log: options.log ?? (() => {}),
    menuCategoryId: options.menuCategoryId,
  });
  return { catalog, post, get };
}

const product = (fields: Record<string, unknown> = {}) => ({
  id: "p1",
  productNumber: "21",
  translated: { name: "Pizza" },
  calculatedPrice: { unitPrice: 7, totalPrice: 7, listPrice: null },
  ...fields,
});

const fetchError = (status?: number, data?: unknown) =>
  Object.assign(new Error("fetch failed"), { statusCode: status, data });

describe("Shopware CatalogPort adapter (anti-corruption)", () => {
  it("prices in the sales channel's currency, in minor units", async () => {
    const { catalog } = catalogOf(
      () => ({ elements: [product({ calculatedPrice: { unitPrice: 1050 } })] }),
      { currency: "JPY" },
    );
    const [dish] = await catalog.listTopSellers(8);
    expect(dish?.price).toEqual(money(1050, "JPY"));
  });

  it("asks for top sellers with inheritance, so marked parents bring their variants", async () => {
    const { catalog, post } = catalogOf(() => ({
      elements: [
        product({ id: "parent", childCount: 2 }),
        product({
          id: "variant",
          parentId: "parent",
          productNumber: "21-normal",
          childCount: null,
        }),
      ],
    }));
    const dishes = await catalog.listTopSellers(8);
    // today's behaviour: the variants appear as dishes of their own
    expect(dishes.map((dish) => [dish.id, dish.needsChoice])).toEqual([
      ["parent", true],
      ["variant", false],
    ]);
    expect(post).toHaveBeenCalledWith(
      "/product",
      expect.objectContaining({
        filter: [{ type: "equals", field: "markAsTopseller", value: true }],
        limit: 8,
      }),
      { headers: { "sw-include-seo-urls": "true", "sw-inheritance": "true" } },
    );
  });

  it("asks for the custom fields of products and options (includes filter `translated` too)", async () => {
    const { catalog, post } = catalogOf(() => ({ elements: [] }));
    await catalog.listUpsellDishes(6);
    const body = post.mock.calls[0]![1] as {
      includes: Record<string, string[]>;
    };
    expect(body.includes.product).toEqual(
      expect.arrayContaining([
        "customFields",
        "translated",
        "sortedProperties",
      ]),
    );
    expect(body.includes.property_group_option).toEqual(
      expect.arrayContaining(["customFields", "translated"]),
    );
  });

  it("validates the sorting itself, since Shopware falls back to its default", async () => {
    const { catalog } = catalogOf(() => ({
      elements: [],
      sorting: "name-asc",
      availableSortings: [{ key: "name-asc", label: "Name A-Z" }],
    }));
    await expect(
      catalog.listDishes("pizza", { sorting: "unknown" }),
    ).rejects.toSatisfy((error) => isDomainError(error, "invalid_value"));
    await expect(
      catalog.listDishes("pizza", { sorting: "name-asc" }),
    ).resolves.toMatchObject({
      sorting: "name-asc",
    });
  });

  it("sends the filter option ids as Shopware's `properties`, page 1 implicitly", async () => {
    const { catalog, post } = catalogOf(() => ({ elements: [] }));
    await catalog.listDishes("pizza", {
      filterOptionIds: ["b", "a", "b"],
      page: 1,
    });
    const body = post.mock.calls[0]![1];
    expect(body).toMatchObject({ properties: "b|a", limit: 100 });
    expect(body).not.toHaveProperty("p");
    expect(body).not.toHaveProperty("order");
  });

  it("answers a failure as backend_unavailable and a 404 as not_found", async () => {
    const down = catalogOf(() => {
      throw fetchError(503);
    });
    await expect(down.catalog.listDishes("pizza")).rejects.toSatisfy((error) =>
      isDomainError(error, "backend_unavailable"),
    );
    const unknown = catalogOf(() => {
      throw fetchError(404);
    });
    await expect(unknown.catalog.getDish("x")).rejects.toSatisfy((error) =>
      isDomainError(error, "not_found"),
    );
  });

  it("answers an id Shopware refuses (400) as invalid_value, not as an outage", async () => {
    const { catalog } = catalogOf(() => {
      throw fetchError(400);
    });
    await expect(catalog.listDishes("foo")).rejects.toSatisfy((error) =>
      isDomainError(error, "invalid_value"),
    );
    await expect(catalog.getSection("foo")).rejects.toSatisfy((error) =>
      isDomainError(error, "invalid_value"),
    );
    // no variant for a dish id Shopware does not take
    expect(await catalog.findVariant("foo", ["a"])).toBeNull();
  });

  it("answers a page after the last one empty, as Shopware refuses it with 404", async () => {
    const { catalog } = catalogOf(() => {
      throw fetchError(404, {
        errors: [{ code: "PRODUCT__LISTING_PAGE_OUT_OF_RANGE" }],
      });
    });
    expect(
      await catalog.listDishes("pizza", { page: 3, sorting: "name-asc" }),
    ).toMatchObject({ dishes: [], page: 3, total: 0, sorting: "name-asc" });
    await expect(catalog.listDishes("pizza")).rejects.toSatisfy((error) =>
      isDomainError(error, "not_found"),
    );
  });

  it("opens the dish sheet without extras when only the extras fail, and logs it", async () => {
    const log = vi.fn();
    const { catalog } = catalogOf(
      (path) => {
        if (path.endsWith("/cross-selling")) throw fetchError(500);
        return { product: product(), configurator: [] };
      },
      { log },
    );
    expect(await catalog.getDish("p1")).toMatchObject({
      id: "p1",
      extraGroups: [],
    });
    expect(log).toHaveBeenCalledOnce();
  });

  it("reads the currency once for several answers", async () => {
    const { catalog, get } = catalogOf(() => ({ elements: [] }));
    await catalog.listTopSellers(8);
    await catalog.listUpsellDishes(6);
    await catalog.searchDishes("pizza");
    expect(get.mock.calls.filter(([path]) => path === "/context")).toHaveLength(
      1,
    );
  });

  it("asks for a variant of a dish number with its family at once", async () => {
    const { catalog, post } = catalogOf((path, body) => {
      if (
        path === "/product" &&
        (body.filter as { field?: string }[])[0]?.field === "productNumber"
      ) {
        return {
          elements: [
            product({ id: "v1", parentId: "p1", productNumber: "21-groß" }),
          ],
        };
      }
      if (path === "/product") {
        return {
          elements: [
            product({ id: "p1", childCount: 1 }),
            product({
              id: "v1",
              parentId: "p1",
              productNumber: "21-groß",
              optionIds: ["g"],
            }),
          ],
        };
      }
      if (path.endsWith("/cross-selling")) return [];
      return {
        product: product({
          id: "v1",
          parentId: "p1",
          productNumber: "21-groß",
        }),
        configurator: [],
      };
    });
    expect(await catalog.findDishByNumber("21-groß")).toMatchObject({
      id: "p1",
      selectedVariantId: "v1",
    });
    // number, then detail, extras and the family in parallel
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("lists variants in a fixed order (by id), also for a partial choice", async () => {
    const { catalog, post } = catalogOf(() => ({ elements: [] }));
    await catalog.findVariant("p1", ["a"]);
    expect(post.mock.calls[0]![1]).toMatchObject({
      sort: [{ field: "id", order: "ASC" }],
      limit: 1,
    });
  });

  it("does not ask Shopware for an empty search or a variant without options", async () => {
    const { catalog, post } = catalogOf(() => ({ elements: [] }));
    expect((await catalog.searchDishes(" ")).dishes).toEqual([]);
    expect(await catalog.findVariant("p1", [])).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("takes the menu root from the runtime config before the plugin's", async () => {
    const own = catalogOf(() => []);
    await own.catalog.getMenu();
    expect(own.post.mock.calls[0]![0]).toBe(
      "/navigation/plugin-root/plugin-root",
    );
    const configured = catalogOf(() => [], { menuCategoryId: "env-root" });
    await configured.catalog.getMenu();
    expect(configured.post.mock.calls[0]![0]).toBe(
      "/navigation/env-root/env-root",
    );
  });

  it("leaves out extras of a list without products", () => {
    expect(
      toExtraGroups(
        [
          { crossSelling: { id: "x", name: "Leer" }, products: [] },
          {
            crossSelling: { id: "y", name: "Extras" },
            products: [
              product({ id: "e", productNumber: "900", available: false }),
            ],
          },
        ],
        "EUR",
      ),
    ).toEqual([
      {
        id: "y",
        name: "Extras",
        extras: [
          {
            id: "e",
            number: "900",
            name: "Pizza",
            price: money(700, "EUR"),
            available: false,
          },
        ],
      },
    ]);
  });
});

describe("Shopware catalog mapping", () => {
  it("links a dish only by an SEO URL that opens its sheet", () => {
    expect(
      toDishPath(
        product({
          seoUrls: [
            { seoPathInfo: "Speisekarte/Pizza/?produkt=21", isCanonical: true },
          ],
        }),
      ),
    ).toBe("/Speisekarte/Pizza/?produkt=21");
    expect(
      toDishPath(
        product({ seoUrls: [{ seoPathInfo: "Pizza/21", isCanonical: true }] }),
      ),
    ).toBeNull();
    expect(
      toDishPath(
        product({
          seoUrls: [
            { seoPathInfo: "Alt/?produkt=21", isCanonical: false },
            { seoPathInfo: "Neu/?produkt=21", isCanonical: true },
          ],
        }),
      ),
    ).toBe("/Neu/?produkt=21");
    expect(toDishPath(product())).toBeNull();
  });

  it("takes media without a URL as none and keeps thumbnails with a width", () => {
    expect(toMedia({ url: null })).toBeNull();
    expect(
      toMedia({
        url: "https://cdn/a.webp",
        metaData: { width: 800, height: 600 },
        thumbnails: [
          { url: "https://cdn/a-400.webp", width: 400 },
          { url: "https://cdn/x.webp" },
        ],
      }),
    ).toEqual({
      url: "https://cdn/a.webp",
      alt: null,
      width: 800,
      height: 600,
      sources: [{ url: "https://cdn/a-400.webp", width: 400 }],
    });
  });

  it("reads the ShopBite property groups by name, the food label codes from the options", () => {
    const dish = toDish(
      product({
        translated: {
          name: "Pizza",
          customFields: { shopbite_allergens_checked: true },
        },
        sortedProperties: [
          {
            id: "g1",
            translated: { name: "Hauptzutaten" },
            options: [{ id: "o1", translated: { name: "Käse" } }],
          },
          {
            id: "g2",
            translated: { name: "Vegan" },
            options: [{ id: "o2", translated: { name: "Ja" } }],
          },
          {
            id: "g3",
            translated: { name: "Vegetarisch" },
            options: [{ id: "o3", translated: { name: "Nein" } }],
          },
          {
            id: "g4",
            translated: { name: "Küche" },
            options: [{ id: "o4", translated: { name: "Italienisch" } }],
          },
          {
            id: "g5",
            translated: { name: "Allergene" },
            options: [
              {
                id: "o5",
                translated: {
                  name: "Weizen",
                  customFields: { shopbite_code: "A" },
                },
              },
            ],
          },
          {
            id: "g6",
            translated: { name: "Größe" },
            options: [{ id: "o6", translated: { name: "Groß" } }],
          },
        ],
      }),
      "EUR",
    );
    expect(dish).toMatchObject({
      ingredients: [{ id: "o1", name: "Käse" }],
      diets: ["vegan"],
      kitchen: "Italienisch",
      foodLabels: {
        allergens: [{ code: "A", name: "Weizen" }],
        additives: [],
        checked: true,
      },
    });
  });

  it("prices a parent with variants from its cheapest variant and keeps a list price", () => {
    expect(
      toDish(
        product({
          childCount: 2,
          calculatedPrice: { unitPrice: 9, listPrice: { price: 12 } },
          calculatedCheapestPrice: { unitPrice: 7 },
        }),
        "EUR",
      ),
    ).toMatchObject({
      price: money(700, "EUR"),
      listPrice: money(1200, "EUR"),
      priceFrom: true,
      needsChoice: true,
    });
  });

  it("gives a section without SEO URL no path", () => {
    expect(
      toSections([{ id: "a", name: "Pizza", type: "page" }])[0]?.path,
    ).toBeNull();
  });

  it("takes only categories of type page as menu sections", () => {
    expect(
      toSections([
        {
          id: "a",
          name: "Pizza",
          type: "page",
          seoUrl: "/Pizza/",
          children: [{ id: "l", type: "link" }],
        },
        { id: "b", name: "Ordner", type: "folder" },
        { id: "c", name: "Instagram", type: "link" },
      ]).map((section) => [section.id, section.children.length]),
    ).toEqual([["a", 0]]);
  });
});
