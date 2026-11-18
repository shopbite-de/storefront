import { createHash } from "node:crypto";

/**
 * Security headers of every response (`server/plugins/security-headers.ts`),
 * from `runtimeConfig.securityHeaders` (NUXT_SECURITY_HEADERS_*). An empty
 * value leaves that header out.
 */
export interface SecurityHeadersConfig {
  /** Sent only when `public.storeUrl` is https. */
  strictTransportSecurity?: string;
  contentTypeOptions?: string;
  frameOptions?: string;
  /** `frame-ancestors` of the enforced Content-Security-Policy. */
  frameAncestors?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  /** Cache-Control of server-rendered HTML without a route rule one. */
  htmlCacheControl?: string;
  contentSecurityPolicyReportOnly?: CspReportOnlyConfig;
}

export interface CspReportOnlyConfig {
  enabled?: boolean;
  /** Extra sources, space- or comma-separated (e.g. a RUM collector). */
  scriptSrc?: string;
  connectSrc?: string;
  imgSrc?: string;
  /** Endpoint for violation reports (`report-uri`), optional. */
  reportUri?: string;
}

function isHttps(url: string | undefined): boolean {
  try {
    return !!url && new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** The headers sent with every response. */
export function securityHeaders(
  config: SecurityHeadersConfig,
  storeUrl?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const set = (name: string, value: string | undefined) => {
    if (value?.trim()) headers[name] = value.trim();
  };

  if (isHttps(storeUrl)) {
    set("strict-transport-security", config.strictTransportSecurity);
  }
  set("x-content-type-options", config.contentTypeOptions);
  set("x-frame-options", config.frameOptions);
  if (config.frameAncestors?.trim()) {
    set(
      "content-security-policy",
      `frame-ancestors ${config.frameAncestors.trim()}`,
    );
  }
  set("referrer-policy", config.referrerPolicy);
  set("permissions-policy", config.permissionsPolicy);
  return headers;
}

/** The origin of a URL, or undefined for an empty or invalid one. */
export function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { origin } = new URL(url);
    return origin === "null" ? undefined : origin;
  } catch {
    return undefined;
  }
}

/** Script types the browser executes, so CSP `script-src` applies. */
const EXECUTABLE_TYPES = new Set([
  "",
  "module",
  "importmap",
  "speculationrules",
  "text/javascript",
  "application/javascript",
]);

/**
 * `'sha256-…'` sources for the inline scripts of an HTML document (Nuxt's
 * runtime config script and the import map); data blocks such as
 * `application/json` (the payload) and `application/ld+json` are not
 * executed and need none.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const [, attrs = "", content = ""] of html.matchAll(scripts)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? "";
    if (!EXECUTABLE_TYPES.has(type.toLowerCase())) continue;
    const hash = createHash("sha256").update(content, "utf8").digest("base64");
    hashes.add(`'sha256-${hash}'`);
  }
  return [...hashes];
}

function sources(list: string | undefined): string[] {
  return (list ?? "")
    .split(/[\s,]+/)
    .map((source) => source.trim())
    .filter(Boolean);
}

function unique(list: (string | undefined)[]): string[] {
  return [...new Set(list.filter((value): value is string => !!value))];
}

/**
 * Report-only policy for a rendered page: own origin, the Shopware endpoint
 * (Store API calls from the browser), the Matomo host and the configured
 * extra sources. Inline scripts are allowed by hash; inline styles stay
 * allowed (Vue style bindings, inlined component CSS).
 */
export function contentSecurityPolicyReportOnly(options: {
  config: CspReportOnlyConfig;
  scriptHashes: string[];
  shopwareEndpoint?: string;
  matomoUrl?: string;
}): string {
  const { config, scriptHashes } = options;
  const shopware = originOf(options.shopwareEndpoint);
  const matomo = originOf(options.matomoUrl);

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      unique(["'self'", ...scriptHashes, matomo, ...sources(config.scriptSrc)]),
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    [
      "img-src",
      unique(["'self'", "data:", "blob:", "https:", shopware, matomo]).concat(
        sources(config.imgSrc),
      ),
    ],
    ["font-src", ["'self'", "data:"]],
    [
      "connect-src",
      unique(["'self'", shopware, matomo, ...sources(config.connectSrc)]),
    ],
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["frame-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  if (config.reportUri?.trim()) {
    directives.push(["report-uri", [config.reportUri.trim()]]);
  }

  return directives
    .map(([name, values]) => `${name} ${unique(values).join(" ")}`)
    .join("; ");
}
