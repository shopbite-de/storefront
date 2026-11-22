import type { H3Event } from "h3";

/** Bodies of the storefront's small forms (wishlist, contact) stay below. */
export const SMALL_BODY_BYTES = 64 * 1024;

const tooLarge = () =>
  createError({
    statusCode: 413,
    statusMessage: "Payload Too Large",
    data: { code: "payload_too_large" },
  });

/**
 * A JSON body of at most `maxBytes`, refused before it is buffered (the
 * declared length) or while it streams in (413 `payload_too_large`). A
 * body that is no JSON is answered as no body (the route's checks refuse
 * it). Without a stream (tests) the parsed body is taken as it is.
 */
export async function readSmallBody(
  event: H3Event,
  maxBytes: number = SMALL_BODY_BYTES,
): Promise<unknown> {
  const declared = Number(getRequestHeader(event, "content-length") ?? 0);
  if (declared > maxBytes) throw tooLarge();
  const request = event.node?.req as
    (AsyncIterable<Uint8Array> & object) | undefined;
  if (!request || typeof request[Symbol.asyncIterator] !== "function") {
    return readBody(event);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw tooLarge();
    chunks.push(chunk);
  }
  if (!size) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}
