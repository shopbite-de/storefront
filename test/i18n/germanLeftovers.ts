import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { germanWords } from "../../eslint/germanText.mjs";

/**
 * The demo menu's own texts (dish, section, extra, ingredient and food
 * label names, descriptions): backend data, German in every locale
 * (ADR 0002). They are taken out before a page is checked.
 */
function menuData(): string[] {
  const strings: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  };
  walk(
    JSON.parse(
      readFileSync(
        new URL("../../server/adapters/memory/demo-menu.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const source = readFileSync(
    new URL("../../server/adapters/memory/demoMenu.ts", import.meta.url),
    "utf8",
  );
  for (const match of source.matchAll(/name: "([^"]+)"/g))
    strings.push(match[1]!);
  // longest first, so a name is removed before the words it contains
  return [...new Set(strings)].sort((a, b) => b.length - a.length);
}

const MENU_DATA = menuData();

/**
 * The German words a guest reads on the page (text, accessible names,
 * title), without the menu's data: none is expected on an English build.
 */
export async function germanLeftovers(page: Page): Promise<string[]> {
  let text = await page.evaluate(() =>
    [
      document.title,
      document.body.innerText,
      ...[
        ...document.querySelectorAll(
          "[aria-label],[title],[placeholder],[alt]",
        ),
      ].map((element) =>
        ["aria-label", "title", "placeholder", "alt"]
          .map((name) => element.getAttribute(name) ?? "")
          .join(" "),
      ),
    ].join("\n"),
  );
  for (const data of MENU_DATA) text = text.split(data).join(" ");
  return [...new Set(germanWords(text))];
}
