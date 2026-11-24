import { checkBackendConfig } from "../adapters/registry";

/**
 * The shop backend's configuration, checked once at startup (ADR 0001,
 * step 8): in production a backend that cannot run (Shopware without
 * NUXT_SHOPWARE_ENDPOINT or NUXT_SHOPWARE_ACCESS_TOKEN, an unknown
 * NUXT_SHOP_BITE_BACKEND) stops the server here instead of failing every
 * request; the environment names of 2.x get one warning. Not while the
 * build prerenders (images are built without the settings).
 */
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return;
  try {
    checkBackendConfig(useRuntimeConfig(), process.env, {
      production: !import.meta.dev,
      warn: (message) => console.warn(message),
    });
  } catch (error) {
    // the reason in one line, not the bundle's stack
    console.error(`[backend] ${(error as Error).message}`);
    process.exit(1);
  }
});
