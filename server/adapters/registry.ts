import type { Backend } from "../ports";
import { memoryFromRuntimeConfig } from "./memory";
import type { BackendRuntimeConfig } from "./runtimeConfig";
import { checkShopwareConfig, shopwareFromRuntimeConfig } from "./shopware";

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

type Env = Readonly<Record<string, string | undefined>>;
type CheckOptions = { production: boolean; warn: (message: string) => void };

/** Startup checks of the adapters that need configuration. */
const CHECKS: Partial<
  Record<
    BackendName,
    (config: BackendRuntimeConfig, env: Env, options: CheckOptions) => void
  >
> = {
  shopware: checkShopwareConfig,
};

/**
 * Checks the selected adapter's configuration once at startup: warnings
 * through `options.warn`, a configuration it cannot run with throws in
 * production (`server/plugins/backend-config.ts` stops the server).
 */
export function checkBackendConfig(
  config: BackendRuntimeConfig,
  env: Env,
  options: CheckOptions,
): void {
  const name = config.shopBite.backend;
  if (!isBackendName(name)) {
    throw new Error(
      `Unknown shopBite.backend "${name}"; use one of ${BACKEND_NAMES.join(", ")}.`,
    );
  }
  CHECKS[name]?.(config, env, options);
}
