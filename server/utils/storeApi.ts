import type { NitroFetchOptions } from "nitropack";

/**
 * Calls the Shopware Store API with a criteria in the request body.
 *
 * Criteria must travel as a POST body: sent as `_criteria` query parameters
 * on a GET, Shopware applies `associations` and `limit` but ignores the
 * `includes` projection, so every entity comes back with all of its fields
 * (a product listing was twice the size, #312).
 */
export function storeApiPost<T>(
  path: string,
  body: Record<string, unknown>,
  options: Pick<NitroFetchOptions<string>, "headers"> = {},
): Promise<T> {
  const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

  // Nitro's typed $fetch resolves the response type per internal route; for
  // a generic T on an external URL it cannot, so the type is asserted.
  return $fetch<T>(`${endpoint}${path}`, {
    method: "POST",
    headers: { "sw-access-key": accessToken, ...options.headers },
    body,
    // a failing request reaches Shopware once (the cached routes back off
    // instead)
    retry: 0,
  }) as Promise<T>;
}

/**
 * Calls a Store API route that takes no criteria (the ShopBite plugin's
 * config, business hours and holidays) with the storefront's access key.
 */
export function storeApiGet<T>(
  path: string,
  options: Pick<NitroFetchOptions<string>, "headers" | "query"> = {},
): Promise<T> {
  const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

  return $fetch<T>(`${endpoint}${path}`, {
    headers: { "sw-access-key": accessToken, ...options.headers },
    query: options.query,
    // ofetch retries a GET once by default; during an outage that doubles
    // every request
    retry: 0,
  }) as Promise<T>;
}

/** A visitor waits no longer for a cart answer (and its cart writes). */
const VISITOR_TIMEOUT_MS = 10_000;

/**
 * A Store API request for one visitor (the Shopware adapter's cart): with
 * the visitor's context token and address chain, answering the token
 * Shopware holds the context under. The server's endpoint (as the Store
 * API bridge and server-side rendering), with a timeout: a paused Shopware
 * answers `backend_unavailable` instead of holding the visitor's writes.
 */
export async function storeApiForVisitor<T>(request: {
  method: "GET" | "POST" | "PATCH";
  path: string;
  body?: Record<string, unknown>;
  contextToken?: string;
  forwardedFor?: string;
}): Promise<{ data: T; contextToken: string | null }> {
  const config = useRuntimeConfig();
  const { endpoint, accessToken } = config.public.shopware;
  const serverEndpoint = (config.shopware as { endpoint?: string } | undefined)
    ?.endpoint;
  const response = await $fetch.raw<T>(
    `${serverEndpoint || endpoint}${request.path}`,
    {
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
      timeout: VISITOR_TIMEOUT_MS,
    },
  );
  return {
    data: response._data as T,
    contextToken: response.headers.get("sw-context-token"),
  };
}
