import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { baseCompile } from "@intlify/message-compiler";

/**
 * The shop's messages (ADR 0002), built at build time: every layer's
 * `i18n/locales/<code>/*.json` and `i18n/locales/<code>.json`, the shop's
 * over the storefront's, compiled to vue-i18n's message AST. The app and
 * the server ship them in their bundles and evaluate them with vue-i18n's
 * message engine without its compiler (i18n/runtime): no compiler in the
 * browser, no request.
 *
 * Pure Node: used by modules/locale.ts and the unit tests.
 */
export type Messages = { [key: string]: string | Messages };

/** A compiled message tree: message ASTs (or static texts) at the leaves. */
export type CompiledMessages = { [key: string]: unknown };

const localesDir = (root: string) => join(root, "i18n", "locales");

const readJson = (file: string): Messages =>
  JSON.parse(readFileSync(file, "utf8")) as Messages;

/** The locale codes the layers have messages for (folder or file). */
export function availableLocales(layerRoots: readonly string[]): string[] {
  const codes = new Set<string>();
  for (const root of layerRoots) {
    const dir = localesDir(root);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (entry.endsWith(".json")) codes.add(entry.slice(0, -5));
      else if (statSync(join(dir, entry)).isDirectory()) codes.add(entry);
    }
  }
  return [...codes].sort();
}

function mergeInto(target: Messages, source: Messages, at: string): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (typeof value === "string" || typeof current === "string") {
      if (typeof value !== typeof current && current !== undefined) {
        throw new Error(
          `[shopbite:locale] ${at}${key} is a message in one file and a group in another.`,
        );
      }
      target[key] = value;
    } else {
      const group: Messages = (current as Messages | undefined) ?? {};
      target[key] = group;
      mergeInto(group, value, `${at}${key}.`);
    }
  }
}

/**
 * The messages of a locale, merged: `layerRoots` as Nuxt orders its
 * layers (the shop first, the storefront last), so a shop's message
 * replaces the storefront's of the same key.
 */
export function loadMessages(
  layerRoots: readonly string[],
  code: string,
): Messages {
  const merged: Messages = {};
  for (const root of [...layerRoots].reverse()) {
    const dir = join(localesDir(root), code);
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      for (const file of readdirSync(dir).sort()) {
        if (file.endsWith(".json")) {
          mergeInto(merged, readJson(join(dir, file)), "");
        }
      }
    }
    const file = `${dir}.json`;
    if (existsSync(file)) mergeInto(merged, readJson(file), "");
  }
  return merged;
}

/** HTML in a message (vue-i18n's strictMessage): links go via `<i18n-t>`. */
const HTML = /<\/?[a-z][^>]*>/i;

const LINKED = /@(\.\w+)?:/;

/** Compiles every message to vue-i18n's (minified) message AST. */
export function compileMessages(messages: Messages, at = ""): CompiledMessages {
  const compiled: CompiledMessages = {};
  for (const [key, value] of Object.entries(messages)) {
    const path = `${at}${key}`;
    if (typeof value !== "string") {
      compiled[key] = compileMessages(value, `${path}.`);
      continue;
    }
    if (HTML.test(value)) {
      throw new Error(
        `[shopbite:locale] ${path} contains HTML; use <i18n-t> with slots: ${JSON.stringify(value)}`,
      );
    }
    // a linked message (`@:key`) does not resolve in the runtime-only
    // build; a literal @ is written {'@'}
    if (LINKED.test(value)) {
      throw new Error(
        `[shopbite:locale] ${path} links another message (@:…), which the runtime does not resolve; write {'@'} for an @: ${JSON.stringify(value)}`,
      );
    }
    const errors: string[] = [];
    const { ast } = baseCompile(value, {
      jit: true,
      minify: true,
      location: false,
      onError: (error) => errors.push(error.message),
    });
    if (errors.length) {
      throw new Error(
        `[shopbite:locale] ${path} is no valid message (${errors.join("; ")}): ${JSON.stringify(value)}`,
      );
    }
    // a text without placeholders stays a string, which the runtime
    // returns as it is
    const body = (ast as { b?: { s?: unknown } }).b;
    compiled[key] = body?.s === value ? value : ast;
  }
  return compiled;
}

/**
 * `#shopbite-messages`: the compiled messages of the shop's locale and, for
 * a locale the shop adds, of its fallback (English).
 */
export function messagesModule(
  layerRoots: readonly string[],
  codes: readonly string[],
): string {
  const messages = Object.fromEntries(
    codes.map((code) => [
      code,
      compileMessages(loadMessages(layerRoots, code)),
    ]),
  );
  return `export const messages = ${JSON.stringify(messages)};\n`;
}
