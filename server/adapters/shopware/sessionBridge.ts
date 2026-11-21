import type { BackendSession } from "../../ports";

/**
 * Transitional (ADR 0001, steps 4 to 7): the Shopware layer
 * (`@shopware/composables`) still runs checkout, account, wishlist and
 * contact in the browser. Its requests reach the Store API through the
 * storefront (`/api/store-api/**`), which adds the access key and the
 * visitor's context token from the session. The browser never receives the
 * token: not as a header, not in a JSON answer (`/context`, `/checkout/cart`
 * and `/account/login` carry it in their body). A token Shopware issues
 * (first request, login, logout, registration) goes into the session.
 * Removed with the layer in step 8.
 *
 * The session state of the Shopware adapter is the context token itself.
 */
export type StoreApiSend = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: Uint8Array | undefined;
  },
) => Promise<{ status: number; headers: Headers; body: Uint8Array }>;

export type ForwardedRequest = Readonly<{
  method: string;
  /** Store API path without the leading slash, e.g. `checkout/order`. */
  path: string;
  /** Query string including `?`, or empty. */
  search: string;
  headers: Readonly<Record<string, string | undefined>>;
  body: Uint8Array | undefined;
  /** The visitor's address, forwarded for Shopware's rate limits. */
  clientIp: string | undefined;
}>;

export type ForwardedAnswer = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array | null;
}>;

const METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const PATH = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const MAX_PATH = 256;

/** Request headers the layer sends that Shopware needs. */
const FORWARDED_HEADERS = [
  "accept",
  "content-type",
  "accept-language",
  "sw-language-id",
  "sw-currency-id",
  "sw-include-seo-urls",
  "sw-inheritance",
  // distributed tracing of shops that trace their storefront
  "traceparent",
  "tracestate",
];

/** Answer headers the browser may see. */
const ANSWERED_HEADERS = ["content-type", "content-disposition"];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const errorAnswer = (status: number, code: string): ForwardedAnswer => ({
  status,
  headers: { "content-type": "application/json" },
  body: encoder.encode(
    JSON.stringify({ errors: [{ status: String(status), code }] }),
  ),
});

/**
 * Removes every value that is one of the tokens: object keys holding one
 * are dropped, array entries become empty strings.
 */
function withoutTokens(value: unknown, tokens: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === "string" && tokens.has(entry)
        ? ""
        : withoutTokens(entry, tokens),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        typeof entry === "string" && tokens.has(entry)
          ? []
          : [[key, withoutTokens(entry, tokens)]],
      ),
    );
  }
  return value;
}

function isAllowedPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= MAX_PATH &&
    PATH.test(path) &&
    !path.split("/").some((segment) => segment === "." || segment === "..")
  );
}

export async function forwardStoreApiRequest(
  request: ForwardedRequest,
  options: Readonly<{
    endpoint: string;
    accessKey: string;
    session: BackendSession;
    send: StoreApiSend;
  }>,
): Promise<ForwardedAnswer> {
  const method = request.method.toUpperCase();
  if (!METHODS.has(method)) return errorAnswer(405, "method_not_allowed");
  if (!isAllowedPath(request.path)) return errorAnswer(404, "not_found");

  const token = await options.session.read();
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers[name];
    if (value) headers[name] = value;
  }
  headers["sw-access-key"] = options.accessKey;
  if (token) headers["sw-context-token"] = token;
  if (request.clientIp) {
    headers["x-forwarded-for"] = request.clientIp;
  }

  let answer: Awaited<ReturnType<StoreApiSend>>;
  try {
    answer = await options.send(
      `${options.endpoint.replace(/\/+$/, "")}/${request.path}${request.search}`,
      {
        method,
        headers,
        body: method === "GET" ? undefined : request.body,
      },
    );
  } catch (cause) {
    console.error("[store-api] Shopware did not answer", cause);
    return errorAnswer(503, "backend_unavailable");
  }

  const issued = answer.headers.get("sw-context-token") ?? undefined;
  if (issued && issued !== token) await options.session.write(issued);

  const answered: Record<string, string> = {};
  for (const name of ANSWERED_HEADERS) {
    const value = answer.headers.get(name);
    if (value) answered[name] = value;
  }

  const tokens = new Set([token, issued].filter((t): t is string => !!t));
  let body: Uint8Array | null = answer.body.length ? answer.body : null;
  if (body && /json/i.test(answered["content-type"] ?? "") && tokens.size) {
    try {
      body = encoder.encode(
        JSON.stringify(withoutTokens(JSON.parse(decoder.decode(body)), tokens)),
      );
    } catch {
      // not JSON after all: blank the tokens in the text
      let text = decoder.decode(body);
      for (const value of tokens) text = text.replaceAll(value, "");
      body = encoder.encode(text);
    }
  }
  return { status: answer.status, headers: answered, body };
}
