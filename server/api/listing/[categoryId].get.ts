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
      // The card reads the properties grouped (ingredients, diets, kitchen);
      // `properties` would repeat every option with its group. The quick view
      // loads its own product (/api/product/[productId]).
      "sortedProperties",
      // Allergens checked (#485); includes filter `translated` as well,
      // so custom fields only come back when listed here.
      "customFields",
      "cover",
      // Groups the dishes of a section by sub-section (#487).
      "categoryIds",
      // "Ausverkauft" on the card (#325).
      "available",
      // Product deep link (#289); the request sends `sw-include-seo-urls`.
      "seoUrls",
      // A parent with variants needs a choice in the quick view; the others
      // can be added from the menu directly (#441).
      "childCount",
    ],
    seo_url: ["seoPathInfo", "isCanonical"],
    // The entity is `property_group`: under `property` the groups came back
    // with every field, nested once more in each option.
    property_group: ["id", "name", "translated", "displayType", "options"],
    property_group_option: [
      "id",
      "name",
      "translated",
      "customFields",
      "media",
      "mediaId",
    ],
    product_option: ["id", "groupId", "name", "translated", "group"],
    ...MEDIA_INCLUDES,
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

export default defineCachedEventHandler(
  async (event) => {
    const categoryId = categoryIdParam(getRouterParam(event, "categoryId"));

    const { order, properties, manufacturer, query, p } = listingParams(
      getQuery(event) as Record<string, unknown>,
    );

    return await storeApiPost(
      `/product-listing/${categoryId}`,
      {
        ...BASE_CRITERIA,
        ...(order !== undefined && { order }),
        ...(properties !== undefined && { properties }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(query !== undefined && { query }),
        ...(p !== undefined && { p }),
      },
      { headers: { "sw-include-seo-urls": "true" } },
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "listing",
    getKey: (event) => {
      const categoryId = categoryIdParam(getRouterParam(event, "categoryId"));
      const q = getQuery(event) as Record<string, unknown>;
      // Validated before it becomes a key (400 otherwise).
      const { order, properties, manufacturer, query, p } = listingParams(q);
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
