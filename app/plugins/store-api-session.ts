/**
 * The Shopware layer without a context token in the browser (ADR 0001,
 * step 4). The storefront session keeps the token server-side:
 *
 * - in the browser the layer's API client talks to the storefront's
 *   `/api/store-api/**` (the server adds the token) and holds no token;
 * - during server-side rendering it uses the visitor's token from the
 *   session (`useUserContextInSSR`), read through the request context
 *   (`server/plugins/visitor-session.ts`). Rendering only reads it.
 *
 * Transitional until the layer is gone (step 8).
 */
type LayerApiClient = {
  defaultHeaders: Record<string, string | undefined>;
  updateBaseConfig: (config: { baseURL?: string }) => void;
};

type StoreApiSession = { read: () => Promise<string | undefined> };

const STORE_API_PROXY_PATH = "/api/store-api";

export default defineNuxtPlugin({
  name: "shopbite:store-api-session",
  async setup(nuxtApp) {
    const apiClient = nuxtApp.$shopwareApiClient as unknown as LayerApiClient;
    if (import.meta.server) {
      const session = (
        useRequestEvent()?.context as
          { shopbiteStoreApiSession?: StoreApiSession } | undefined
      )?.shopbiteStoreApiSession;
      const token = await session?.read().catch((error: unknown) => {
        console.error("[session] reading the visitor's session failed", error);
        return undefined;
      });
      apiClient.defaultHeaders["sw-context-token"] = token ?? "";
      return;
    }
    const { baseURL } = useRuntimeConfig().app;
    apiClient.updateBaseConfig({
      baseURL: `${baseURL.replace(/\/+$/, "")}${STORE_API_PROXY_PATH}`,
    });
    apiClient.defaultHeaders["sw-context-token"] = "";
  },
});
