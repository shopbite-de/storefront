import { DomainError } from "../../../../shared/domain";
import { askCatalog } from "../../../utils/catalogData";

/**
 * A dish or a variant by menu number (`?number=`), for the dish sheet's
 * deep link (DishDetail, a variant's number selects it). 404 if none, which
 * is not cached.
 */
export default defineCachedEventHandler(
  async (event) => {
    const number = numberParam(getQuery(event) as Record<string, unknown>);
    return askCatalog(event, async (catalog) => {
      const dish = await catalog.findDishByNumber(number);
      if (!dish) {
        throw new DomainError("not_found", `No dish has the number ${number}.`);
      }
      return dish;
    });
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.product,
    name: "dish-number",
    getKey: (event) =>
      `number-${numberParam(getQuery(event) as Record<string, unknown>)}`,
  },
);
