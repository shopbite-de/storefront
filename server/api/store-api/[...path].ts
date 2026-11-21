import type { H3Event } from "h3";
import {
  forwardedFor,
  forwardStoreApiRequest,
} from "../../adapters/shopware/sessionBridge";

/** Larger bodies are no Store API request of the storefront. */
const MAX_BODY_BYTES = 1_000_000;

const tooLarge = () =>
  createError({ statusCode: 413, statusMessage: "Payload Too Large" });

/** The body, refused before buffering when it is larger than the cap. */
async function readLimitedBody(
  event: H3Event,
): Promise<Uint8Array | undefined> {
  if (event.method === "GET" || event.method === "HEAD") return undefined;
  const declared = Number(getRequestHeader(event, "content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw tooLarge();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of event.node.req as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw tooLarge();
    chunks.push(chunk);
  }
  return size ? new Uint8Array(Buffer.concat(chunks)) : undefined;
}

/**
 * Transitional (ADR 0001, steps 4 to 7): the Store API for the Shopware
 * layer in the browser (checkout, account, wishlist, contact), with the
 * visitor's context token from the session instead of a cookie the browser
 * can read. See `server/adapters/shopware/sessionBridge.ts`.
 */
export default defineEventHandler(async (event) => {
  assertSameOriginWrite(event);
  answerPrivately(event);

  const body = await readLimitedBody(event);
  const session = await backendSession(event, "shopware", { create: true });
  // a write with an outdated session would act on a replaced token (or a
  // throwaway cart): the browser has the new cookie, so it may retry
  if (event.method !== "GET" && (await useVisitorSession(event).isStale())) {
    setResponseStatus(event, 409);
    return { errors: [{ status: "409", code: "stale_session" }] };
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
      body,
      forwardedFor: forwardedFor(
        getRequestHeader(event, "x-forwarded-for"),
        event.node.req.socket?.remoteAddress,
      ),
    },
    {
      endpoint: privateEndpoint || shopware.endpoint,
      accessKey: shopware.accessToken,
      session,
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
