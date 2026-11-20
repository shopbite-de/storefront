import type { H3Event } from "h3";
import type { CatalogPort } from "../ports";
import { answerDomain } from "./domainHttp";

/**
 * The menu behind the BFF (ADR 0001, step 2): the routes under
 * `/api/listing`, `/api/search`, `/api/top-sellers` and `/api/menu` answer
 * domain types from `CatalogPort`. Each is a cached handler (shop-wide, the
 * same for every visitor; TTLs `public.shopBite.cacheTtl`) whose key
 * carries the section or dish id, so the backoffice purge finds it
 * (`server/utils/cachePurge.ts`). A DomainError becomes its HTTP answer
 * and is never cached.
 */
export function askCatalog<T>(
  event: H3Event,
  ask: (catalog: CatalogPort) => Promise<T>,
): Promise<T> {
  return answerDomain(() => ask(useBackend(event).catalog));
}

/** How many top sellers the home page shows. */
export const TOP_SELLERS_LIMIT = 8;
/** How many dishes the confirmation step suggests. */
export const UPSELL_LIMIT = 6;
