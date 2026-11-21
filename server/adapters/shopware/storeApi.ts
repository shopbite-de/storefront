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
  post<T>(
    path: string,
    body: Record<string, unknown>,
    options?: { headers?: Record<string, string> },
  ): Promise<T>;
}

/**
 * The Store API for one visitor: the request carries the visitor's context
 * token (none for a new visitor), the answer the token Shopware holds the
 * visitor's context under (a new one on the first request, after login …).
 */
export interface VisitorStoreApi {
  send<T>(request: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    body?: Record<string, unknown>;
    contextToken?: string;
    /** The visitor's address chain, sent as `X-Forwarded-For`. */
    forwardedFor?: string;
  }): Promise<{ data: T; contextToken: string | null }>;
}

/**
 * Lets concurrent GETs of the same path share one request while it is in
 * flight (the browser asks for the configuration and the shipping methods
 * at once, both read the plugin's `/shopbite/config`; every catalog answer
 * reads the currency of `/context`). Nothing is kept
 * after the answer: caching stays in the server routes (ADR 0001).
 */
export function sharingRequestsInFlight(
  storeApi: StoreApi,
  paths: readonly string[],
): StoreApi {
  const pending = new Map<string, Promise<unknown>>();
  return {
    get: <T>(path: string, options?: { query?: Record<string, unknown> }) => {
      if (options || !paths.includes(path))
        return storeApi.get<T>(path, options);
      let request = pending.get(path);
      if (!request) {
        request = storeApi.get<T>(path).finally(() => pending.delete(path));
        pending.set(path, request);
      }
      return request as Promise<T>;
    },
    post: (path, body, options) =>
      options ? storeApi.post(path, body, options) : storeApi.post(path, body),
  };
}
