import type { components } from "~~/api-types/storeApiTypes";

type Schemas = components["schemas"];

const criteria = {
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
      "options",
      "optionIds",
      "categories",
      "configuratorSettings",
      "children",
      "parentId",
      "sortedProperties",
      "cover",
    ],
    // The entity is `property_group`: under `property` the groups came back
    // with every field. Options keep their group for the configurator and
    // the ingredient selection (`option.group.name`).
    property_group: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "group"],
    product_configurator_setting: ["id", "optionId", "option", "productId"],
    category: ["id", "name", "translated"],
    ...MEDIA_INCLUDES,
  },
  associations: {
    cover: { associations: { media: {} } },
    categories: {},
    properties: { associations: { group: {} } },
    options: { associations: { group: {} } },
    configuratorSettings: {
      associations: { option: { associations: { group: {} } } },
    },
    children: {
      associations: {
        properties: { associations: { group: {} } },
        options: { associations: { group: {} } },
      },
    },
  },
};

export default defineCachedEventHandler(
  async (
    event,
  ): Promise<{
    product: Schemas["Product"];
    configurator?: Schemas["PropertyGroup"][];
  }> => {
    const productId = getRouterParam(event, "productId")!;

    return await storeApiPost(`/product/${productId}`, criteria);
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.product,
    name: "product",
    getKey: (event) => `product-${getRouterParam(event, "productId")}`,
  },
);
