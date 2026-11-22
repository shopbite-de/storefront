/**
 * The Shopware layer (`@shopware/nuxt-module`, `@shopware/composables`)
 * without a way to the backend (ADR 0001, step 7): every area of the
 * storefront talks to its own BFF routes, so nothing of the layer may
 * reach Shopware any more, neither from the browser (with the public
 * access key) nor during server-side rendering (with a visitor's token).
 *
 * - In the browser the layer's API client gets a base URL no request can
 *   be sent to: a layer composable a shop still calls fails at once,
 *   before anything leaves the browser.
 * - During server-side rendering it carries no context token.
 *
 * The bridge `/api/store-api/**` of steps 4 to 6 is gone. Removed with the
 * layer in step 8.
 */
type LayerApiClient = {
  defaultHeaders: Record<string, string | undefined>;
  updateBaseConfig: (config: { baseURL?: string }) => void;
};

/** Not fetchable: the browser refuses the scheme without a request. */
export const OFFLINE_BASE_URL = "about:invalid";

export default defineNuxtPlugin({
  name: "shopbite:shopware-layer-offline",
  setup(nuxtApp) {
    const apiClient = nuxtApp.$shopwareApiClient as unknown as
      LayerApiClient | undefined;
    if (!apiClient) return;
    apiClient.defaultHeaders["sw-context-token"] = "";
    if (import.meta.client) {
      apiClient.updateBaseConfig({ baseURL: OFFLINE_BASE_URL });
    }
  },
});
