import { existsSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import type { Nuxt } from "nuxt/schema";

// Files in public/ are not fingerprinted, so they get 30 days instead of the
// year (immutable) of /_nuxt/: a file replaced under the same name reaches
// returning visitors within 30 days, so replace files under a new name (#273).
export const PUBLIC_CACHE_CONTROL =
  "public, max-age=2592000, stale-while-revalidate=86400";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Cache-Control for the files in public/ of every layer (the shop's and this
 * storefront's): Nitro serves them without it. A route rule per file keeps
 * the header off the HTML pages. Images resized by IPX (`/_ipx`) get the same
 * lifetime through `image.ipx.maxAge` in nuxt.config.ts.
 */
export default function publicCache(_options: unknown, nuxt: Nuxt) {
  const rules = (nuxt.options.routeRules ??= {});
  const headers = { "cache-control": PUBLIC_CACHE_CONTROL };

  for (const layer of nuxt.options._layers) {
    const { config } = layer;
    const publicDir = resolve(
      config.srcDir || layer.cwd,
      config.dir?.public || "public",
    );
    if (!existsSync(publicDir)) continue;

    for (const file of listFiles(publicDir)) {
      const path = "/" + relative(publicDir, file).split(sep).join("/");
      rules[path] = {
        ...rules[path],
        headers: { ...headers, ...rules[path]?.headers },
      };
    }
  }
}
