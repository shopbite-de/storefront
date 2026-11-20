import type { Dish } from "../../shared/domain";
import { createResilientLoader } from "../utils/backoff";
import { askCatalog, TOP_SELLERS_LIMIT } from "../utils/catalogData";

const load = createResilientLoader<readonly Dish[]>();

/**
 * The dishes marked as top sellers (Dish[]), for the home page. Every
 * page view of the home page renders them, so an outage serves the last
 * good answer and pauses the backend (`createResilientLoader`).
 */
export default defineCachedEventHandler(
  (event) =>
    askCatalog(event, (catalog) =>
      load("top-sellers", () => catalog.listTopSellers(TOP_SELLERS_LIMIT)),
    ),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "top-sellers",
    getKey: () => "top-sellers",
  },
);
