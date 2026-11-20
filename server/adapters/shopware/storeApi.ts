/**
 * How the Shopware adapter reaches the Store API with the storefront's
 * access key. The registry passes the Nitro utils `storeApiGet` and
 * `storeApiPost`; contract tests pass a fake that answers Shopware JSON.
 */
export interface StoreApi {
  get<T>(
    path: string,
    options?: { query?: Record<string, unknown> },
  ): Promise<T>;
  post<T>(path: string, body: Record<string, unknown>): Promise<T>;
}
