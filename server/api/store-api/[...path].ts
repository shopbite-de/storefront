import { forwardStoreApiRequest } from "../../adapters/shopware/sessionBridge";

/** Larger bodies are no Store API request of the storefront. */
const MAX_BODY_BYTES = 1_000_000;

/**
 * Transitional (ADR 0001, steps 4 to 7): the Store API for the Shopware
 * layer in the browser (checkout, account, wishlist, contact), with the
 * visitor's context token from the session instead of a cookie the browser
 * can read. See `server/adapters/shopware/sessionBridge.ts`.
 */
export default defineEventHandler(async (event) => {
  assertSameOriginWrite(event);
  answerPrivately(event);

  const raw =
    event.method === "GET" ? undefined : await readRawBody(event, false);
  if (raw && raw.length > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "Payload Too Large" });
  }
  const config = useRuntimeConfig();
  const shopware = config.public.shopware as {
    endpoint: string;
    accessToken: string;
  };
  const privateEndpoint = (config.shopware as { endpoint?: string } | undefined)
    ?.endpoint;
  const url = getRequestURL(event);

  const answer = await forwardStoreApiRequest(
    {
      method: event.method,
      path: getRouterParam(event, "path") ?? "",
      search: url.search,
      headers: getRequestHeaders(event),
      body: raw ? new Uint8Array(raw) : undefined,
      clientIp: getRequestIP(event, { xForwardedFor: true }),
    },
    {
      endpoint: privateEndpoint || shopware.endpoint,
      accessKey: shopware.accessToken,
      session: await backendSession(event, "shopware", { create: true }),
      send: async (target, init) => {
        const response = await fetch(target, {
          method: init.method,
          headers: init.headers,
          body: init.body as BodyInit | undefined,
          redirect: "manual",
          signal: AbortSignal.timeout(30_000),
        });
        return {
          status: response.status,
          headers: response.headers,
          body: new Uint8Array(await response.arrayBuffer()),
        };
      },
    },
  );

  setResponseStatus(event, answer.status);
  for (const [name, value] of Object.entries(answer.headers)) {
    setResponseHeader(event, name, value);
  }
  return answer.body ? Buffer.from(answer.body) : null;
});
