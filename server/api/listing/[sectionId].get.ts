import { versionedKey } from "../../utils/cacheKeys";
import { askCatalog } from "../../utils/catalogData";

/**
 * One page of the dishes of a menu section (MenuListing): `order` (a key
 * of `listingSortings`), `filters` (option ids, `|`-separated), `p`.
 * Validated before they become the key (400 otherwise).
 */
export default defineCachedEventHandler(
  async (event) => {
    const sectionId = idParam(getRouterParam(event, "sectionId"), "sectionId");
    const params = listingParams(getQuery(event) as Record<string, unknown>);
    return askCatalog(event, (catalog) =>
      catalog.listDishes(sectionId, toListingQuery(params)),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "listing",
    getKey: (event) => {
      const sectionId = idParam(
        getRouterParam(event, "sectionId"),
        "sectionId",
      );
      const { order, filters, p } = listingParams(
        getQuery(event) as Record<string, unknown>,
      );
      return versionedKey(
        [sectionId, order ?? "", filters ?? "", p ?? 1].join("|"),
      );
    },
  },
);
