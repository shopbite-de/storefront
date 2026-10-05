import { queryCollection } from "@nuxt/content/server";
import type { components } from "~~/api-types/storeApiTypes";
import { getDiets, getMainIngredients } from "../../app/utils/product";
import { splitList, toAbsoluteUrl } from "../../app/utils/seo";
import { buildLlmsTxt, type LlmsMenuSection } from "../utils/llmsTxt";

type Schemas = components["schemas"];

// Store API maximum per request.
const PRODUCT_PAGE_SIZE = 100;
// A menu has a few hundred products at most (La Fattoria: 390 incl. extras).
const MAX_PRODUCT_PAGES = 10;

const NAVIGATION_CRITERIA = {
  depth: 10,
  buildTree: true,
  includes: {
    category: ["id", "name", "translated", "seoUrl", "type", "children"],
  },
};

const PRODUCT_CRITERIA = {
  limit: PRODUCT_PAGE_SIZE,
  // Main products only; variants are summed up as "ab <cheapest price>".
  filter: [{ type: "equals", field: "parentId", value: null }],
  associations: { properties: { associations: { group: {} } } },
  includes: {
    product: [
      "id",
      "name",
      "translated",
      "categoryIds",
      "childCount",
      "calculatedPrice",
      "calculatedCheapestPrice",
      "sortedProperties",
    ],
    calculated_price: ["unitPrice"],
    calculated_cheapest_price: ["unitPrice"],
    property_group: ["name", "translated", "options"],
    property_group_option: ["name", "translated"],
  },
};

/**
 * `/llms.txt` (#402): the shop, its hours, ordering and the menu as Markdown
 * for language models. Every source is optional; a failing request leaves
 * its section out instead of failing the file.
 */
export default defineEventHandler(async (event) => {
  const { shopware, shopBite, site } = useRuntimeConfig(event).public;
  const siteUrl = getSiteConfig(event).url;
  const headers = { "sw-access-key": shopware.accessToken };
  const menuRootId = shopBite.menuCategoryId || "main-navigation";

  const storeApi = <T>(path: string, body?: Record<string, unknown>) =>
    $fetch<T>(`${shopware.endpoint}${path}`, {
      method: body ? "POST" : "GET",
      headers: { ...headers, "sw-include-seo-urls": "true" },
      body,
    });

  const [navigation, products, hours, holidays, config, context, pages] =
    await Promise.allSettled([
      storeApi<Schemas["Category"][]>(
        `/navigation/${menuRootId}/${menuRootId}`,
        NAVIGATION_CRITERIA,
      ),
      loadProducts((page) =>
        storeApiPost<{ elements?: Schemas["Product"][] }>("/product", {
          ...PRODUCT_CRITERIA,
          page,
        }),
      ),
      storeApi<{ businessHours?: Schemas["ShopbiteBusinessHour"][] }>(
        "/shopbite/business-hour",
      ),
      storeApi<{ holidays?: { start?: string; end?: string }[] }>(
        "/shopbite/holiday",
      ),
      storeApi<{ isCheckoutEnabled?: boolean; deliveryTime?: number }>(
        "/shopbite/config",
      ),
      storeApi<Schemas["SalesChannelContext"]>("/context"),
      queryCollection(event, "landingpages")
        .select("path", "title", "description")
        .all(),
    ]);

  const value = <T>(result: PromiseSettledResult<T>) =>
    result.status === "fulfilled" ? result.value : undefined;

  const productsByCategory = groupByCategory(value(products) ?? []);
  const toSection = (category: Schemas["Category"]): LlmsMenuSection => ({
    name: category.translated?.name ?? category.name,
    url: category.seoUrl ? toAbsoluteUrl(siteUrl, category.seoUrl) : undefined,
    items: (productsByCategory.get(category.id) ?? []).map(toMenuItem),
    sections: (category.children ?? [])
      .filter((child) => child.type === "page")
      .map(toSection),
  });

  const body = buildLlmsTxt({
    name: site.name,
    description: site.description,
    url: siteUrl,
    cuisine: site.cuisine,
    address: {
      street: site.address.street,
      postalCode: site.address.postalCode
        ? String(site.address.postalCode)
        : undefined,
      city: site.address.city,
    },
    telephone: site.telephone,
    googleBusinessProfileUrl: site.googleBusinessProfileUrl,
    deliveryAreas: splitList(site.deliveryAreas),
    businessHours: value(hours)?.businessHours,
    holidays: value(holidays)?.holidays,
    isCheckoutEnabled: value(config)?.isCheckoutEnabled,
    deliveryTime: value(config)?.deliveryTime,
    menuUrl: toAbsoluteUrl(siteUrl, "/speisekarte"),
    menu: (value(navigation) ?? [])
      .filter((category) => category.type === "page")
      .map(toSection),
    pages: (value(pages) ?? [])
      // Pages the shop keeps out of robots.txt (legal pages) stay out here.
      .filter(
        (page) =>
          getPathRobotConfig(event, {
            path: page.path,
            skipSiteIndexable: true,
          }).indexable,
      )
      .map((page) => ({
        title: page.title,
        url: toAbsoluteUrl(siteUrl, page.path),
        description: page.description,
      })),
    currency: value(context)?.currency?.isoCode,
    now: new Date(),
  });

  setResponseHeader(event, "Content-Type", "text/markdown; charset=utf-8");
  return body;
});

async function loadProducts(
  loadPage: (page: number) => Promise<{ elements?: Schemas["Product"][] }>,
) {
  const products: Schemas["Product"][] = [];
  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const elements = (await loadPage(page)).elements ?? [];
    products.push(...elements);
    if (elements.length < PRODUCT_PAGE_SIZE) break;
  }
  return products;
}

/** Products by the categories they are assigned to directly. */
function groupByCategory(products: Schemas["Product"][]) {
  const byCategory = new Map<string, Schemas["Product"][]>();
  for (const product of products) {
    for (const categoryId of product.categoryIds ?? []) {
      byCategory.set(categoryId, [
        ...(byCategory.get(categoryId) ?? []),
        product,
      ]);
    }
  }
  // Alphabetical, numbers in natural order ("Pizza 9" before "Pizza 10").
  for (const items of byCategory.values()) {
    items.sort((a, b) =>
      (a.translated?.name ?? a.name).localeCompare(
        b.translated?.name ?? b.name,
        "de",
        { numeric: true },
      ),
    );
  }
  return byCategory;
}

function toMenuItem(product: Schemas["Product"]) {
  const properties = product.sortedProperties as
    Schemas["PropertyGroup"][] | undefined;
  const hasVariants = (product.childCount ?? 0) > 0;
  return {
    name: product.translated?.name ?? product.name,
    price: hasVariants
      ? (product.calculatedCheapestPrice?.unitPrice ??
        product.calculatedPrice?.unitPrice)
      : product.calculatedPrice?.unitPrice,
    fromPrice: hasVariants,
    ingredients: getMainIngredients(properties).map(
      (option) => option.translated?.name ?? option.name,
    ),
    diets: getDiets(properties),
  };
}
