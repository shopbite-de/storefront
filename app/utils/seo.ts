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

/** Default home page title: `<Shopname> <Ort> | Online bestellen & liefern lassen`. */
export function buildHomeTitle({ name, city }: SiteInfo): string {
  const place = city && !name.includes(city) ? `${name} ${city}` : name;
  return `${place} | Online bestellen & liefern lassen`;
}

/** Default home page description from city and cuisine, if any is configured. */
export function buildHomeDescription({
  name,
  city,
  cuisine,
}: SiteInfo): string | undefined {
  if (cuisine && city) {
    return `${cuisine} in ${city}: Bei ${name} online bestellen und liefern lassen oder abholen.`;
  }
  if (city) {
    return `${name} in ${city}: Online bestellen und liefern lassen oder abholen.`;
  }
  if (cuisine) {
    return `${cuisine}: Bei ${name} online bestellen und liefern lassen oder abholen.`;
  }
  return undefined;
}
