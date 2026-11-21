import { versionedKey } from "../../../../utils/cacheKeys";
import { askCatalog } from "../../../../utils/catalogData";

/**
 * The variant of a dish with the chosen options (Variant, or null):
 * `options` are option ids, `|`-separated, one per variant group or fewer.
 */
export default defineCachedEventHandler(
  async (event) => {
    const dishId = idParam(getRouterParam(event, "dishId"), "dishId");
    const optionIds = optionIdsParam(
      getQuery(event) as Record<string, unknown>,
    );
    return askCatalog(event, (catalog) =>
      catalog.findVariant(dishId, optionIds),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.variant,
    name: "variant",
    getKey: (event) => {
      const dishId = idParam(getRouterParam(event, "dishId"), "dishId");
      const optionIds = optionIdsParam(
        getQuery(event) as Record<string, unknown>,
      );
      return versionedKey(`variant-${dishId}-${optionIds.join("|")}`);
    },
  },
);
