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
  /**
   * `X-Forwarded-For` for Shopware's per-IP rate limits: the incoming chain
   * with the address the request came from appended (`forwardedFor()`).
   */
  forwardedFor: string | undefined;
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

/** Most entries of a forwarded chain; the nearest ones are kept. */
const MAX_FORWARDED = 20;

/**
 * The `X-Forwarded-For` a proxy sends on: the chain the request brought
 * with the socket address appended. Shopware takes the rightmost address
 * it does not trust, so with `TRUSTED_PROXIES` listing the storefront and
 * the proxies in front of it (and nothing else), an entry a visitor forged
 * on the left is never taken. Without a socket address nothing is sent.
 */
export function forwardedFor(
  incoming: string | undefined,
  remoteAddress: string | undefined,
): string | undefined {
  if (!remoteAddress) return undefined;
  const chain = (incoming ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...chain, remoteAddress].slice(-MAX_FORWARDED).join(", ");
}

/** Replaces every occurrence of a secret in a text. */
function redactText(
  text: string,
  replacements: ReadonlyMap<string, string>,
): string {
  let result = text;
  for (const [secret, by] of replacements) {
    result = result.replaceAll(secret, by);
  }
  return result;
}

/**
 * The answer without the secrets: a value that is a token is dropped
 * (object key) or emptied (array entry); every other string and every key
 * has the secrets replaced (Shopware writes the token into error texts and
 * `meta.parameters`, the internal endpoint into routing errors).
 */
function redact(
  value: unknown,
  tokens: ReadonlySet<string>,
  replacements: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") return redactText(value, replacements);
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === "string" && tokens.has(entry)
        ? ""
        : redact(entry, tokens, replacements),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        typeof entry === "string" && tokens.has(entry)
          ? []
          : [
              [
                redactText(key, replacements),
                redact(entry, tokens, replacements),
              ],
            ],
      ),
    );
  }
  return value;
}

/** Answers the browser may read as text; others (PDF) pass unchanged. */
const TEXTUAL = /json|text|xml|html|javascript/i;

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
  if (request.forwardedFor) headers["x-forwarded-for"] = request.forwardedFor;

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
  const replacements = new Map<string, string>(
    [...tokens].map((value) => [value, "***"]),
  );
  try {
    replacements.set(new URL(options.endpoint).origin, "");
  } catch {
    // no absolute endpoint: nothing to hide
  }
  let body: Uint8Array | null = answer.body.length ? answer.body : null;
  const type = answered["content-type"] ?? "";
  if (body && TEXTUAL.test(type)) {
    const text = decoder.decode(body);
    try {
      body = encoder.encode(
        JSON.stringify(redact(JSON.parse(text), tokens, replacements)),
      );
    } catch {
      body = encoder.encode(redactText(text, replacements));
    }
  }
  return { status: answer.status, headers: answered, body };
}
