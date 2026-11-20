import type { Backend } from "../ports";
import { createMemoryBackend } from "./memory";
import { createShopwareBackend, type StoreApi } from "./shopware";

/** Values of `shopBite.backend` (`NUXT_SHOP_BITE_BACKEND`). */
export const BACKEND_NAMES = ["shopware", "memory"] as const;

export type BackendName = (typeof BACKEND_NAMES)[number];

export function isBackendName(name: string): name is BackendName {
  return (BACKEND_NAMES as readonly string[]).includes(name);
}

/** What the adapters need from the running storefront. */
export type BackendDependencies = Readonly<{
  storeApi: StoreApi;
  storeUrl: string;
}>;

/** A new adapter set; `useBackend()` keeps one per process. */
export function createBackend(
  name: string,
  dependencies: BackendDependencies,
): Backend {
  if (!isBackendName(name)) {
    throw new Error(
      `Unknown shopBite.backend "${name}"; use one of ${BACKEND_NAMES.join(", ")}.`,
    );
  }
  switch (name) {
    case "shopware":
      return createShopwareBackend(dependencies);
    case "memory":
      return createMemoryBackend();
  }
}
