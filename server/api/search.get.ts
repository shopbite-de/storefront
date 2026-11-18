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
      // The card reads the properties grouped (ingredients, diets, kitchen);
      // `properties` would repeat every option with its group. The quick view
      // loads its own product (/api/product/[productId]).
      "sortedProperties",
      // Allergens checked (#485); includes filter `translated` as well,
      // so custom fields only come back when listed here.
      "customFields",
      "cover",
      // "Ausverkauft" on the card (#325).
      "available",
    ],
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
    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;
    const q = getQuery(event) as Record<string, unknown>;

    const { search, order, p } = searchParams(q);

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
      // Validated before it becomes a key (400 otherwise).
      const { search, order, p } = searchParams(q);
      return [search ?? "", order ?? "", p ?? 1].join("|");
    },
  },
);
