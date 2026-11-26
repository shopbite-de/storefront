import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadMessages, type Messages } from "../../i18n/messages";

/**
 * Every message key the code names literally exists in the German messages
 * (ADR 0002): `t("…")`, `$t("…")`, `keypath="…"` and any string that is a
 * key of an area (validation schemas, status tables). A key built at
 * runtime (`` t(`menu.diets.${diet}`) ``) is the parity test's matter.
 */
const root = fileURLToPath(new URL("../..", import.meta.url));
const AREAS = [
  "common",
  "menu",
  "order",
  "auth",
  "account",
  "contact",
  "server",
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(?:ts|vue)$/.test(entry) ? [path] : [];
  });
}

const has = (messages: Messages, key: string) =>
  typeof key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Messages)[part] : undefined,
      messages,
    ) === "string";

// a quoted key, but not a bound attribute's expression (`:key="order.id"`)
const KEY = new RegExp(
  `(?:keypath=|(?<!=))(["'])((?:${AREAS.join("|")})\\.[A-Za-z0-9_.-]+)\\1`,
  "g",
);

describe("message keys in the code", () => {
  const de = loadMessages([root], "de");
  const files = ["app", "server", "shared", "i18n/runtime"].flatMap((dir) =>
    sources(join(root, dir)),
  );

  it("finds the keys it checks", () => {
    const found = files.flatMap((file) => [
      ...readFileSync(file, "utf8").matchAll(KEY),
    ]);
    expect(found.length).toBeGreaterThan(300);
  });

  it("all exist in the German messages", () => {
    const missing: string[] = [];
    for (const file of files) {
      for (const match of readFileSync(file, "utf8").matchAll(KEY)) {
        const key = match[2]!.replace(/\.$/, "");
        if (!has(de, key)) missing.push(`${relative(root, file)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
