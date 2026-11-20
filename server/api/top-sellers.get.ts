import { DomainError, isDomainError, type Dish } from "../../shared/domain";
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
      load("top-sellers", () =>
        catalog.listTopSellers(TOP_SELLERS_LIMIT),
      ).catch((error: unknown) => {
        // the loader's own 503 (paused, no last good answer) with a code,
        // like every BFF route
        const status = (error as { statusCode?: number } | null)?.statusCode;
        throw !isDomainError(error) && status === 503
          ? new DomainError(
              "backend_unavailable",
              "The backend is paused after a failure (top-sellers).",
              {},
              { cause: error },
            )
          : error;
      }),
    ),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "top-sellers",
    getKey: () => "top-sellers",
  },
);
