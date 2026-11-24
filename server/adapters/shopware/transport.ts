/**
 * The Store API of the running storefront (ADR 0001, step 8; until 2.x
 * `server/utils/storeApi.ts`): Nitro's `$fetch` to the one private
 * endpoint with the private access key, for shop-wide requests and for
 * visitors alike (cart, checkout, account, password reset, wishlist,
 * contact form), so Shopware sees the visitor's `X-Forwarded-For` on an
 * internal address.
 *
 * Every request has a deadline (10 s by default; undici's own limit is
 * 300 s) and is never retried (ofetch retries a GET once by default; the
 * cached routes back off instead). All share the process's outage
 * breaker (`server/utils/outageBreaker.ts`).
 */
import type { NitroFetchOptions } from "nitropack";
import { guardedRequest } from "../../utils/outageBreaker";
import type { ShopwareConnection } from "./connection";
import type { StoreApi, VisitorStoreApi } from "./storeApi";

const STORE_API_TIMEOUT_MS = 10_000;

type Fetch = (<T>(url: string, options: object) => Promise<T>) & {
  raw: <T>(
    url: string,
    options: object,
  ) => Promise<{ _data?: T; headers: Headers }>;
};

/** Nitro's global `$fetch` (stubbed by the tests). */
const fetcher = (): Fetch => (globalThis as { $fetch: Fetch }).$fetch;

export function createShopwareTransport(connection: ShopwareConnection): {
  storeApi: StoreApi;
  visitorApi: VisitorStoreApi;
} {
  const { endpoint, accessToken } = connection;
  return {
    storeApi: {
      get: <T>(
        path: string,
        options: Pick<NitroFetchOptions<string>, "headers" | "query"> = {},
      ) =>
        guardedRequest(() =>
          fetcher()<T>(`${endpoint}${path}`, {
            headers: { "sw-access-key": accessToken, ...options.headers },
            query: options.query,
            retry: 0,
            timeout: STORE_API_TIMEOUT_MS,
          }),
        ),
      /**
       * Criteria travel as a POST body: sent as `_criteria` query
       * parameters on a GET, Shopware applies `associations` and `limit`
       * but ignores the `includes` projection (#312).
       */
      post: <T>(
        path: string,
        body: Record<string, unknown>,
        options: { headers?: Record<string, string> } = {},
      ) =>
        guardedRequest(() =>
          fetcher()<T>(`${endpoint}${path}`, {
            method: "POST",
            headers: { "sw-access-key": accessToken, ...options.headers },
            body,
            retry: 0,
            timeout: STORE_API_TIMEOUT_MS,
          }),
        ),
    },
    visitorApi: {
      send: async <T>(
        request: Parameters<VisitorStoreApi["send"]>[0],
      ): Promise<{ data: T; contextToken: string | null }> => {
        const response = await guardedRequest(() =>
          fetcher().raw<T>(`${endpoint}${request.path}`, {
            method: request.method,
            headers: {
              "sw-access-key": accessToken,
              ...(request.contextToken
                ? { "sw-context-token": request.contextToken }
                : {}),
              ...(request.forwardedFor
                ? { "x-forwarded-for": request.forwardedFor }
                : {}),
            },
            body: request.body,
            retry: 0,
            timeout: request.timeoutMs ?? STORE_API_TIMEOUT_MS,
          }),
        );
        return {
          data: response._data as T,
          contextToken: response.headers.get("sw-context-token"),
        };
      },
    },
  };
}
