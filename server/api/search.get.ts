import { versionedKey } from "../utils/cacheKeys";
import { askCatalog } from "../utils/catalogData";

/**
 * Dishes matching a text (MenuListing): `query`, `order`, `p`. An empty
 * text finds nothing without asking the backend.
 */
export default defineCachedEventHandler(
  async (event) => {
    const { search, order, p } = searchParams(
      getQuery(event) as Record<string, unknown>,
    );
    return askCatalog(event, (catalog) =>
      catalog.searchDishes(search ?? "", toListingQuery({ order, p })),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "search",
    getKey: (event) => {
      // Validated before it becomes a key (400 otherwise).
      const { search, order, p } = searchParams(
        getQuery(event) as Record<string, unknown>,
      );
      return versionedKey([search ?? "", order ?? "", p ?? 1].join("|"));
    },
  },
);
