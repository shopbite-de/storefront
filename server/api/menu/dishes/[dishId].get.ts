import { askCatalog } from "../../../utils/catalogData";

/**
 * What the dish sheet needs (DishDetail): variants, extras, removable
 * ingredients, food labels. A variant's id answers its dish with that
 * variant selected; 404 for an unknown dish.
 */
export default defineCachedEventHandler(
  async (event) => {
    const dishId = idParam(getRouterParam(event, "dishId"), "dishId");
    return askCatalog(event, (catalog) => catalog.getDish(dishId));
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.product,
    name: "dish",
    getKey: (event) =>
      `dish-${idParam(getRouterParam(event, "dishId"), "dishId")}`,
  },
);
