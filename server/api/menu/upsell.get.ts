import { askCatalog, UPSELL_LIMIT } from "../../utils/catalogData";

/** Dishes suggested on the order confirmation step (Dish[], "Dazu passt"). */
export default defineCachedEventHandler(
  (event) =>
    askCatalog(event, (catalog) => catalog.listUpsellDishes(UPSELL_LIMIT)),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "upsell",
    getKey: () => "upsell",
  },
);
