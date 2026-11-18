/**
 * Security headers on every response (`runtimeConfig.securityHeaders`,
 * `server/utils/securityHeaders.ts`). Server-rendered HTML additionally gets
 * `Cache-Control: private, no-store` (it may contain the visitor's cart or
 * login, `useUserContextInSSR`) unless a route rule sets one, an optional
 * Content-Security-Policy-Report-Only with hashes of its inline scripts,
 * and no `x-powered-by`.
 */
import type { SecurityHeadersConfig } from "../utils/securityHeaders";

interface RenderResponse {
  body?: unknown;
  headers?: Record<string, string | number | string[] | undefined>;
}

export default defineNitroPlugin((nitroApp) => {
  const runtimeConfig = useRuntimeConfig();
  const config = (runtimeConfig.securityHeaders ?? {}) as SecurityHeadersConfig;
  const headers = securityHeaders(config, runtimeConfig.public.storeUrl);

  nitroApp.hooks.hook("request", (event) => {
    setResponseHeaders(event, headers);
  });

  nitroApp.hooks.hook(
    "render:response",
    (response: RenderResponse, { event }) => {
      event.node.res.removeHeader("x-powered-by");
      const responseHeaders = (response.headers ??= {});
      delete responseHeaders["x-powered-by"];

      const contentType = String(responseHeaders["content-type"] ?? "");
      if (!contentType.includes("text/html")) return;

      if (
        config.htmlCacheControl?.trim() &&
        !responseHeaders["cache-control"]
      ) {
        responseHeaders["cache-control"] = config.htmlCacheControl.trim();
      }

      const csp = config.contentSecurityPolicyReportOnly;
      if (csp?.enabled && typeof response.body === "string") {
        responseHeaders["content-security-policy-report-only"] =
          contentSecurityPolicyReportOnly({
            config: csp,
            scriptHashes: inlineScriptHashes(response.body),
            shopwareEndpoint: runtimeConfig.public.shopware?.endpoint,
            matomoUrl: runtimeConfig.public.scripts?.matomoAnalytics?.matomoUrl,
          });
      }
    },
  );
});
