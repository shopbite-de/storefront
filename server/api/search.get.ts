import type { components } from "~~/api-types/storeApiTypes";

type Schemas = components["schemas"];

const BASE_CRITERIA = {
  includes: {
    product: [
      "id",
      "productNumber",
      "name",
      "description",
      "calculatedPrice",
      "translated",
      "properties",
      "propertyIds",
      "sortedProperties",
      "cover",
    ],
    property: ["id", "name", "translated", "displayType", "options"],
    property_group_option: [
      "id",
      "name",
      "translated",
      "group",
      "media",
      "mediaId",
    ],
    product_option: ["id", "groupId", "name", "translated", "group"],
  },
  associations: {
    cover: {
      associations: {
        media: {},
      },
    },
    properties: {
      associations: {
        group: {},
        media: {},
      },
    },
  },
  limit: 100,
};

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : undefined;
}

function sanitizePage(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : undefined;
}

export default defineCachedEventHandler(
  async (event) => {
    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;
    const q = getQuery(event) as Record<string, unknown>;

    const search = sanitizeString(q.query, 256);
    const order = sanitizeString(q.order, 64);
    const p = sanitizePage(q.p);

    if (!search) {
      return {
        elements: [],
        aggregations: {},
        availableSortings: [],
      } as unknown as Schemas["ProductListingResult"];
    }

    return await $fetch(`${endpoint}/search`, {
      method: "POST",
      headers: {
        "sw-access-key": accessToken,
        "sw-include-seo-urls": "true",
      },
      body: {
        search,
        ...BASE_CRITERIA,
        ...(order && { order }),
        ...(p && { p }),
      },
    });
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "search",
    getKey: (event) => {
      const q = getQuery(event) as Record<string, unknown>;
      const search = sanitizeString(q.query, 256) ?? "";
      const order = sanitizeString(q.order, 64) ?? "";
      const p = sanitizePage(q.p) ?? 1;
      return [search, order, p].join("|");
    },
  },
);
