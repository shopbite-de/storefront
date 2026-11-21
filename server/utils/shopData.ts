import type { H3Event } from "h3";
import { DomainError } from "../../shared/domain";
import type { Backend } from "../ports";
import { createBackoff, createResilientLoader, isOutage } from "./backoff";
import { answerDomain } from "./domainHttp";

/**
 * Restaurant operations behind the BFF (ADR 0001, step 1): what every page
 * renders (configuration, opening hours, holidays, branches, shipping
 * methods with their lead times) as the ports answer it.
 *
 * - `cached()` for server-side rendering and llms.txt: a cached function
 *   per value (`swr: false`, so never older than its TTL) behind a
 *   resilient loader that serves the last good answer during an outage and
 *   pauses the backend after a failure.
 * - `fresh()` for the browser's live values (`?fresh=1`): straight from the
 *   port, never from a cache or an old answer. The checkout asks it right
 *   before an order whether the restaurant accepts orders (the ShopBite
 *   plugin refuses a paused order too; this is defence in depth and gives
 *   the guest a clear message). While the backend is paused after a
 *   failure, a fresh request fails fast instead of reaching it.
 *
 * Every failure is a DomainError (`backend_unavailable` during an
 * outage), so the routes answer `{ data: { code } }` like every BFF route.
 *
 * The cache purge (`server/utils/cachePurge.ts`) empties them by name.
 */
export type BackendData<T> = Readonly<{
  name: string;
  cached: () => Promise<T>;
  fresh: () => Promise<T>;
}>;

export function defineBackendData<T>(
  name: string,
  maxAge: number,
  read: (backend: Backend) => Promise<T>,
): BackendData<T> {
  const cached = defineCachedFunction(async () => read(useBackend()), {
    name,
    maxAge,
    swr: false,
    getKey: () => name,
  });
  // one pause per value for its cached and its fresh reads
  const backoff = createBackoff();
  const load = createResilientLoader<T>(undefined, backoff);
  const unavailable = () =>
    new DomainError(
      "backend_unavailable",
      `The backend is paused after a failure (${name}).`,
    );
  return {
    name,
    // the loader answers a pause without a last good answer as
    // `backend_unavailable` itself
    cached: () => load(name, () => cached()),
    fresh: async () => {
      if (backoff.active()) throw unavailable();
      try {
        return await read(useBackend());
      } catch (error) {
        if (isOutage(error)) backoff.trip();
        throw error;
      }
    },
  };
}

const { cacheTtl } = useRuntimeConfig().public.shopBite;

/** `ShopConfig`; carries the switch that accepts orders, so short-lived. */
export const shopConfigData = defineBackendData(
  "shop-config",
  cacheTtl.config,
  (backend) => backend.shop.getConfig(),
);

export const openingHoursData = defineBackendData(
  "shop-opening-hours",
  cacheTtl.businessHours,
  (backend) => backend.shop.getOpeningHours(),
);

export const holidaysData = defineBackendData(
  "shop-holidays",
  cacheTtl.holidays,
  (backend) => backend.shop.getHolidays(),
);

export const branchesData = defineBackendData(
  "shop-branches",
  cacheTtl.config,
  (backend) => backend.shop.listBranches(),
);

/** Lead times decide the earliest wished time, so short-lived. */
export const shippingMethodsData = defineBackendData(
  "shipping-methods",
  cacheTtl.config,
  (backend) => backend.checkout.listShippingMethods(),
);

/** Names of the cached functions above, for the cache purge. */
export const BACKEND_DATA_NAMES = [
  shopConfigData,
  openingHoursData,
  holidaysData,
  branchesData,
  shippingMethodsData,
].map((data) => data.name);

/** `?fresh=1`: the browser asks for the live value. */
export function wantsFresh(event: H3Event): boolean {
  return getQuery(event).fresh === "1";
}

/** The route answer: cached, or fresh on request; DomainErrors as HTTP. */
export function answerBackendData<T>(
  event: H3Event,
  data: BackendData<T>,
): Promise<T> {
  return answerDomain(() => (wantsFresh(event) ? data.fresh() : data.cached()));
}
