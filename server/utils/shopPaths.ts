import { shopLocale } from "#shopbite-locale";
import { pathOf, type PageName } from "../../i18n/shopLocale";

/**
 * The path of one of the app's pages in the shop's locale (ADR 0002), for
 * links the server writes: payment results, llms.txt, the memory
 * backend's mails.
 */
export function shopPath(
  name: PageName,
  params?: Readonly<Record<string, string>>,
): string {
  return pathOf(shopLocale.pagePaths, name, params);
}
