import { encodeForQuery } from "@shopware/api-client/helpers";

/**
 * Fixed projections applied to every listing request. Defined server-side so
 * clients cannot override includes/associations/limit via query params.
 */
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

/** Validates and returns a non-empty string up to maxLength, or undefined. */
function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : undefined;
}

/** Validates page number: positive integer in [1, 1000]. */
function sanitizePage(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : undefined;
}

function resolveAllowedParams(query: Record<string, unknown>) {
  return {
    order: sanitizeString(query.order, 64),
    properties: sanitizeString(query.properties, 2048),
    manufacturer: sanitizeString(query.manufacturer, 2048),
    query: sanitizeString(query.query, 256),
    p: sanitizePage(query.p),
  };
}

export default defineCachedEventHandler(
  async (event) => {
    const categoryId = getRouterParam(event, "categoryId")!;
    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

    const { order, properties, manufacturer, query, p } = resolveAllowedParams(
      getQuery(event) as Record<string, unknown>,
    );

    const criteria = {
      ...BASE_CRITERIA,
      ...(order !== undefined && { order }),
      ...(properties !== undefined && { properties }),
      ...(manufacturer !== undefined && { manufacturer }),
      ...(query !== undefined && { query }),
      ...(p !== undefined && { p }),
    };

    return await $fetch(`${endpoint}/product-listing/${categoryId}`, {
      headers: {
        "sw-access-key": accessToken,
        "sw-include-seo-urls": "true",
      },
      query: { _criteria: encodeForQuery(criteria) },
    });
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "listing",
    getKey: (event) => {
      const categoryId = getRouterParam(event, "categoryId") ?? "";
      const q = getQuery(event) as Record<string, unknown>;
      const { order, properties, manufacturer, query, p } =
        resolveAllowedParams(q);
      return [
        categoryId,
        order ?? "",
        properties ?? "",
        manufacturer ?? "",
        query ?? "",
        p ?? 1,
      ].join("|");
    },
  },
);
