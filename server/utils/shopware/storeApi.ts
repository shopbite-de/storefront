import type { H3Event } from "h3";

const CONTEXT_TOKEN_COOKIE = "sw-context-token";

/**
 * Build Shopware Store API headers from the incoming request.
 * Reads the session token from the client's cookie and forwards it,
 * so the server-side proxy is transparent to Shopware's session model.
 */
function buildShopwareHeaders(event: H3Event): Record<string, string> {
  const { accessToken } = useRuntimeConfig().public.shopware;
  const contextToken = getCookie(event, CONTEXT_TOKEN_COOKIE);

  return {
    "sw-access-key": accessToken,
    "content-type": "application/json",
    ...(contextToken ? { "sw-context-token": contextToken } : {}),
  };
}

/**
 * Forward an updated context token from Shopware's response back to the client
 * as a cookie. Shopware issues a new token when a guest session is created.
 */
function forwardContextToken(event: H3Event, responseHeaders: Headers): void {
  const newToken = responseHeaders.get(CONTEXT_TOKEN_COOKIE);
  if (!newToken) return;

  setCookie(event, CONTEXT_TOKEN_COOKIE, newToken, {
    httpOnly: false, // must be readable by @shopware/api-client on the client
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year, matching Shopware session lifetime
  });
}

/**
 * Proxy a request to the Shopware Store API.
 * Handles session token forwarding in both directions automatically.
 *
 * @example
 * const cart = await shopwareFetch<SwCart>(event, '/checkout/cart')
 * const updated = await shopwareFetch<SwCart>(event, '/checkout/cart/line-item', {
 *   method: 'POST',
 *   body: { items },
 * })
 */
export async function shopwareFetch<T>(
  event: H3Event,
  path: string,
  init?: {
    method?: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  },
): Promise<T> {
  const { endpoint } = useRuntimeConfig().public.shopware;

  let response: Awaited<ReturnType<typeof $fetch.raw<T>>>;

  try {
    response = await $fetch.raw<T>(`${endpoint}${path}`, {
      headers: buildShopwareHeaders(event),
      method: (init?.method ?? "GET") as
        | "GET"
        | "POST"
        | "PATCH"
        | "DELETE"
        | "PUT",
      body: init?.body,
      query: init?.query,
    });
  } catch (err: unknown) {
    // ofetch throws FetchError on non-2xx; unwrap and re-throw as H3 error
    const fetchErr = err as {
      response?: { status?: number; _data?: unknown };
    };
    throw createError({
      statusCode: fetchErr.response?.status ?? 500,
      data: fetchErr.response?._data,
    });
  }

  forwardContextToken(event, response.headers);

  return response._data as T;
}
