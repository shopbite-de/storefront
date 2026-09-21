import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import type { Nuxt } from "nuxt/schema";
import publicCache, { PUBLIC_CACHE_CONTROL } from "../../modules/public-cache";

function layer(files: string[]) {
  const root = mkdtempSync(join(tmpdir(), "public-cache-"));
  for (const file of files) {
    const path = join(root, "public", file);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "x");
  }
  return { cwd: root, config: { srcDir: root, rootDir: root } };
}

function run(layers: ReturnType<typeof layer>[], routeRules = {}) {
  const nuxt = { options: { _layers: layers, routeRules } } as unknown as Nuxt;
  publicCache(undefined, nuxt);
  return nuxt.options.routeRules as Record<
    string,
    { headers?: Record<string, string> }
  >;
}

describe("public-cache module", () => {
  it("adds Cache-Control for the public files of every layer", () => {
    const rules = run([
      layer(["brand/logo.png"]),
      layer(["hero-poster.webp", "light/Logo.png"]),
    ]);

    for (const path of [
      "/brand/logo.png",
      "/hero-poster.webp",
      "/light/Logo.png",
    ]) {
      expect(rules[path]?.headers?.["cache-control"]).toBe(
        PUBLIC_CACHE_CONTROL,
      );
    }
    expect(rules["/"]).toBeUndefined();
  });

  it("keeps headers a shop configured itself", () => {
    const rules = run([layer(["favicon.ico"])], {
      "/favicon.ico": { headers: { "cache-control": "no-cache", "x-a": "1" } },
    });

    expect(rules["/favicon.ico"]?.headers).toEqual({
      "cache-control": "no-cache",
      "x-a": "1",
    });
  });

  it("skips layers without a public directory", () => {
    const root = mkdtempSync(join(tmpdir(), "public-cache-"));

    expect(
      run([{ cwd: root, config: { srcDir: root, rootDir: root } }]),
    ).toEqual({});
  });
});
