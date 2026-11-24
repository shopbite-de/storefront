import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { germanWords } from "../support/germanText.mjs";

/**
 * The storefront's messages (ADR 0002): English has every German message
 * and nothing more, with the same placeholders, and none reads German.
 */
type Messages = { [key: string]: string | Messages };

const localeDir = (code: string) =>
  new URL(`../../i18n/locales/${code}/`, import.meta.url);

const areas = (code: string) =>
  readdirSync(localeDir(code))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();

const loadArea = (code: string, area: string): Messages =>
  JSON.parse(readFileSync(new URL(`${area}.json`, localeDir(code)), "utf8"));

const load = (code: string): Messages =>
  Object.assign({}, ...areas(code).map((area) => loadArea(code, area)));

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") flat.set(path, value);
    else for (const entry of flatten(value, path)) flat.set(...entry);
  }
  return flat;
}

/** `{name}` placeholders and `@:linked` messages, sorted. */
const placeholders = (message: string) =>
  [...message.matchAll(/\{\s*([\w.]+)\s*\}|@:([\w.]+)/g)]
    .map((match) => match[1] ?? `@:${match[2]}`)
    .sort();

/** vue-i18n splits a message at `|` into plural forms. */
const pluralForms = (message: string) => message.split("|").length;

const de = flatten(load("de"));
const en = flatten(load("en"));

describe("locale messages", () => {
  it("are one file per area in both languages, keyed by the area", () => {
    expect(areas("en")).toEqual(areas("de"));
    for (const code of ["de", "en"]) {
      for (const area of areas(code)) {
        expect(Object.keys(loadArea(code, area))).toEqual([area]);
      }
    }
  });

  it("English has every German message", () => {
    expect([...de.keys()].filter((key) => !en.has(key))).toEqual([]);
  });

  it("English has no message German lacks", () => {
    expect([...en.keys()].filter((key) => !de.has(key))).toEqual([]);
  });

  it("have the same placeholders and plural forms in both languages", () => {
    const differing = [...de]
      .filter(([key]) => en.has(key))
      .filter(
        ([key, message]) =>
          placeholders(message).join() !== placeholders(en.get(key)!).join() ||
          pluralForms(message) !== pluralForms(en.get(key)!),
      )
      .map(([key]) => key);
    expect(differing).toEqual([]);
  });

  it("no English message reads German", () => {
    const german = [...en]
      .map(([key, message]) => [key, germanWords(message).join(" ")])
      .filter(([, words]) => words);
    expect(german).toEqual([]);
  });

  it("no message is empty", () => {
    const empty = [...de, ...en].filter(([, message]) => !message.trim());
    expect(empty).toEqual([]);
  });

  it("escape the characters vue-i18n reads as syntax", () => {
    // an e-mail address or a bare @ starts a linked message, `{` a
    // placeholder: they must be written as {'@'} / {'{'}
    const unescaped = [...de, ...en]
      .filter(([, message]) => /(^|[^{'])@(?!:)/.test(message))
      .map(([key]) => key);
    expect(unescaped).toEqual([]);
  });
});
