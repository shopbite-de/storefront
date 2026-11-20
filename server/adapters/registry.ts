import type { Backend } from "../ports";
import { memoryFromRuntimeConfig } from "./memory";
import type { BackendRuntimeConfig } from "./runtimeConfig";
import { shopwareFromRuntimeConfig } from "./shopware";

export type { BackendRuntimeConfig } from "./runtimeConfig";

/** Each adapter builds itself from the runtime config. */
const ADAPTERS = {
  shopware: shopwareFromRuntimeConfig,
  memory: memoryFromRuntimeConfig,
} satisfies Record<string, (config: BackendRuntimeConfig) => Backend>;

/** Values of `shopBite.backend` (`NUXT_SHOP_BITE_BACKEND`). */
export const BACKEND_NAMES = Object.keys(ADAPTERS) as (keyof typeof ADAPTERS)[];

export type BackendName = keyof typeof ADAPTERS;

export function isBackendName(name: string): name is BackendName {
  return Object.hasOwn(ADAPTERS, name);
}

/** A new adapter set for `shopBite.backend`; `useBackend()` keeps one. */
export function createBackend(config: BackendRuntimeConfig): Backend {
  const name = config.shopBite.backend;
  if (!isBackendName(name)) {
    throw new Error(
      `Unknown shopBite.backend "${name}"; use one of ${BACKEND_NAMES.join(", ")}.`,
    );
  }
  return ADAPTERS[name](config);
}
