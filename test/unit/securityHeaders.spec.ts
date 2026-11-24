import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contentSecurityPolicyReportOnly,
  inlineScriptHashes,
  securityHeaders,
  type SecurityHeadersConfig,
} from "../../server/utils/securityHeaders";

const CONFIG: SecurityHeadersConfig = {
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
  contentTypeOptions: "nosniff",
  frameOptions: "DENY",
  frameAncestors: "'none'",
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  htmlCacheControl: "private, no-store",
  contentSecurityPolicyReportOnly: { enabled: true },
};

const sha = (content: string) =>
  `'sha256-${createHash("sha256").update(content).digest("base64")}'`;

describe("securityHeaders", () => {
  it("sends the hardening headers for an https shop", () => {
    expect(securityHeaders(CONFIG, "https://shop.example.com")).toEqual({
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": "frame-ancestors 'none'",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    });
  });

  it("sends no HSTS when the store URL is not https", () => {
    for (const url of ["http://localhost:3000", "", undefined, "nonsense"]) {
      expect(securityHeaders(CONFIG, url)).not.toHaveProperty(
        "strict-transport-security",
      );
    }
  });

  it("leaves a header out when its value is empty", () => {
    const headers = securityHeaders(
      {
        ...CONFIG,
        frameOptions: "",
        frameAncestors: "https://partner.example",
      },
      "https://shop.example.com",
    );

    expect(headers).not.toHaveProperty("x-frame-options");
    expect(headers["content-security-policy"]).toBe(
      "frame-ancestors https://partner.example",
    );
    expect(securityHeaders({}, "https://shop.example.com")).toEqual({});
  });
});

describe("inlineScriptHashes", () => {
  it("hashes executable inline scripts only", () => {
    const config = "window.__NUXT__={};window.__NUXT__.config={}";
    const importMap = '{"imports":{"#entry":"/_nuxt/a.js"}}';
    const html = [
      `<script type="importmap">${importMap}</script>`,
      `<script>${config}</script>`,
      '<script type="module" src="/_nuxt/a.js" crossorigin></script>',
      '<script type="application/json" id="__NUXT_DATA__">[1]</script>',
      '<script type="application/ld+json">{"@type":"Restaurant"}</script>',
    ].join("");

    expect(inlineScriptHashes(html)).toEqual([sha(importMap), sha(config)]);
  });
});

describe("contentSecurityPolicyReportOnly", () => {
  const directives = (policy: string) =>
    Object.fromEntries(
      policy.split("; ").map((d) => {
        const [name, ...values] = d.split(" ");
        return [name, values];
      }),
    );

  it("allows self, Matomo, the configured hosts and the hashes", () => {
    const policy = directives(
      contentSecurityPolicyReportOnly({
        config: {
          enabled: true,
          connectSrc: "https://rum.example.com",
          scriptSrc: "https://cdn.example.com",
          reportUri: "https://rum.example.com/csp",
        },
        scriptHashes: ["'sha256-abc'"],
        matomoUrl: "https://stats.example.com/",
      }),
    );

    expect(policy["default-src"]).toEqual(["'self'"]);
    expect(policy["script-src"]).toEqual([
      "'self'",
      "'sha256-abc'",
      "https://stats.example.com",
      "https://cdn.example.com",
    ]);
    expect(policy["connect-src"]).toEqual([
      "'self'",
      "https://stats.example.com",
      "https://rum.example.com",
    ]);
    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["report-uri"]).toEqual(["https://rum.example.com/csp"]);
    expect(policy["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("leaves out unset hosts", () => {
    const policy = directives(
      contentSecurityPolicyReportOnly({
        config: { enabled: true },
        scriptHashes: [],
      }),
    );

    expect(policy["script-src"]).toEqual(["'self'"]);
    expect(policy["connect-src"]).toEqual(["'self'"]);
    expect(policy).not.toHaveProperty("report-uri");
  });
});

describe("security headers plugin", () => {
  type Hook = (...args: unknown[]) => void;
  let hooks: Record<string, Hook>;
  let setResponseHeaders: ReturnType<typeof vi.fn>;

  async function loadPlugin(config: SecurityHeadersConfig = CONFIG) {
    vi.resetModules();
    hooks = {};
    setResponseHeaders = vi.fn();
    const utils = await import("../../server/utils/securityHeaders");
    vi.stubGlobal("defineNitroPlugin", (plugin: unknown) => plugin);
    vi.stubGlobal("setResponseHeaders", setResponseHeaders);
    vi.stubGlobal("useRuntimeConfig", () => ({
      securityHeaders: config,
      // the browser never talks to Shopware (3.0): its endpoint, maybe an
      // internal address, is no source of the policy
      shopware: { endpoint: "http://shopware.internal:8000/store-api" },
      public: {
        storeUrl: "https://shop.example.com",
        scripts: { matomoAnalytics: { matomoUrl: "", siteId: "" } },
      },
    }));
    for (const [name, value] of Object.entries(utils)) {
      vi.stubGlobal(name, value);
    }
    const plugin = (await import("../../server/plugins/security-headers"))
      .default as unknown as (app: unknown) => void;
    plugin({ hooks: { hook: (name: string, fn: Hook) => (hooks[name] = fn) } });
  }

  const render = (headers: Record<string, string>, body = "<html></html>") => {
    const event = { node: { res: { removeHeader: vi.fn() } } };
    const response = { body, headers };
    hooks["render:response"]!(response, { event });
    return { response, event };
  };

  beforeEach(() => loadPlugin());
  afterEach(() => vi.unstubAllGlobals());

  it("sets the headers on every request", () => {
    const event = {};
    hooks.request!(event);

    expect(setResponseHeaders).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-frame-options": "DENY",
      }),
    );
  });

  it("marks rendered HTML private and removes x-powered-by", () => {
    const { response, event } = render({
      "content-type": "text/html;charset=utf-8",
      "x-powered-by": "Nuxt",
    });

    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers).not.toHaveProperty("x-powered-by");
    expect(event.node.res.removeHeader).toHaveBeenCalledWith("x-powered-by");
  });

  it("keeps a Cache-Control set by a route rule", () => {
    const { response } = render({
      "content-type": "text/html",
      "cache-control": "public, max-age=60",
    });

    expect(response.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("leaves non-HTML responses uncached by the rule", () => {
    const { response } = render({ "content-type": "text/plain" });

    expect(response.headers).not.toHaveProperty("cache-control");
    expect(response.headers).not.toHaveProperty(
      "content-security-policy-report-only",
    );
  });

  it("adds a report-only policy with the hashes of the page's inline scripts", () => {
    const script = "window.__NUXT__={}";
    const { response } = render(
      { "content-type": "text/html" },
      `<html><script>${script}</script></html>`,
    );

    const policy = response.headers["content-security-policy-report-only"];
    expect(policy).toContain(`script-src 'self' ${sha(script)}`);
    expect(policy).toContain("connect-src 'self';");
    expect(policy).not.toContain("shopware.internal");
  });

  it("sends no report-only policy when it is disabled", async () => {
    await loadPlugin({
      ...CONFIG,
      contentSecurityPolicyReportOnly: { enabled: false },
    });
    const { response } = render({ "content-type": "text/html" });

    expect(response.headers).not.toHaveProperty(
      "content-security-policy-report-only",
    );
  });
});

describe("nuxt.config", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lets the service worker cache no pages", async () => {
    vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
    const config = (await import("../../nuxt.config")).default as {
      pwa: { generateSW: { runtimeCaching?: unknown[] } };
      runtimeConfig: { securityHeaders: SecurityHeadersConfig };
    };

    expect(config.pwa.generateSW.runtimeCaching ?? []).toEqual([]);
    expect(config.runtimeConfig.securityHeaders.htmlCacheControl).toBe(
      "private, no-store",
    );
  });
});
