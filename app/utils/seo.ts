import { hasProtocol, joinURL, withTrailingSlash } from "ufo";

type SiteInfo = {
  name: string;
  city?: string;
  cuisine?: string;
};

/**
 * Applies the site title template (`%s` = page title, `%siteName` = shop
 * name). A missing title or the bare shop name renders as the shop name.
 */
export function formatPageTitle(
  title: string | null | undefined,
  siteName: string,
  template: string,
): string {
  if (!title || title === siteName) return siteName;
  if (!template) return title;
  return template.replaceAll("%siteName", siteName).replaceAll("%s", title);
}

/**
 * Resolves a site-relative path against the site URL. Absolute URLs are kept,
 * and so is the trailing slash of the path: Shopware SEO URLs such as
 * `/c/Pizza/` only resolve with it.
 */
export function toAbsoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (hasProtocol(pathOrUrl, { acceptRelative: true })) return pathOrUrl;
  const url = joinURL(siteUrl, pathOrUrl);
  return pathOrUrl.endsWith("/") ? withTrailingSlash(url) : url;
}

/**
 * The words of the default home page title and description in the shop's
 * language (messages `common.homeSeo.*`); this file is imported by the
 * server, so the caller translates.
 */
export type HomeSeoWords = {
  /** After the shop name and city: "Online bestellen & liefern lassen". */
  titleSuffix: string;
  description: (
    kind: "cuisineAndCity" | "city" | "cuisine",
    params: { name: string; city: string; cuisine: string },
  ) => string;
};

/** Default home page title: `<shop name> <city> | <title suffix>`. */
export function buildHomeTitle(
  { name, city }: SiteInfo,
  words: HomeSeoWords,
): string {
  const place = city && !name.includes(city) ? `${name} ${city}` : name;
  return `${place} | ${words.titleSuffix}`;
}

/** Default home page description from city and cuisine, if any is configured. */
export function buildHomeDescription(
  { name, city = "", cuisine = "" }: SiteInfo,
  words: HomeSeoWords,
): string | undefined {
  const params = { name, city, cuisine };
  if (cuisine && city) return words.description("cuisineAndCity", params);
  if (city) return words.description("city", params);
  if (cuisine) return words.description("cuisine", params);
  return undefined;
}

/**
 * A comma-separated env value as a list, e.g. the delivery areas (#401).
 * Nuxt parses a JSON array value already.
 */
export function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
