import { withLeadingSlash, withQuery } from "ufo";

/** Query parameter that holds the product number of the open quick view. */
export const PRODUCT_QUICK_VIEW_PARAM = "produkt";
/** Deselected main ingredients by name, comma-separated (#411). */
export const WITHOUT_INGREDIENTS_PARAM = "ohne";
/** Selected extras by product number, comma-separated (#411). */
export const EXTRAS_PARAM = "extras";

/** The quick view configuration a link carries. */
export type QuickViewConfiguration = {
  productNumber: string;
  without: string[];
  extras: string[];
};

/** A comma-separated query value (or repeated parameter) as a list. */
export function parseListParam(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((entry): entry is string => typeof entry === "string")
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The query of a configured quick view: the three parameters replace the
 * old ones, everything else (filters) is kept; empty lists are left out.
 */
export function withQuickViewConfiguration(
  query: Record<string, unknown>,
  configuration: QuickViewConfiguration | undefined,
): Record<string, unknown> {
  const {
    [PRODUCT_QUICK_VIEW_PARAM]: _product,
    [WITHOUT_INGREDIENTS_PARAM]: _without,
    [EXTRAS_PARAM]: _extras,
    ...rest
  } = query;
  if (!configuration) return rest;
  return {
    ...rest,
    [PRODUCT_QUICK_VIEW_PARAM]: configuration.productNumber,
    ...(configuration.without.length && {
      [WITHOUT_INGREDIENTS_PARAM]: configuration.without.join(","),
    }),
    ...(configuration.extras.length && {
      [EXTRAS_PARAM]: configuration.extras.join(","),
    }),
  };
}

type SeoUrlLike = { seoPathInfo?: string; isCanonical?: boolean };

/**
 * The URL of a product (#289): there are no product pages, a product is the
 * quick view over its category, `<category>?produkt=<productNumber>`.
 *
 * The product SEO URL from the backend wins when it is such a deep link (the
 * ShopBite plugin sets the template, shopware-plugin#28), so shop owners can
 * change it in the admin. Otherwise the link is built from the category path
 * the product is listed in. Returns a path, or undefined without either.
 */
export function productDeepLink(
  product: { productNumber?: string; seoUrls?: SeoUrlLike[] | null },
  categoryPath?: string,
): string | undefined {
  const seoUrls = product.seoUrls ?? [];
  const seoPath = (seoUrls.find((url) => url.isCanonical) ?? seoUrls[0])
    ?.seoPathInfo;
  if (seoPath && isDeepLink(seoPath)) return withLeadingSlash(seoPath);

  if (!categoryPath || !product.productNumber) return undefined;
  return withQuery(withLeadingSlash(categoryPath), {
    [PRODUCT_QUICK_VIEW_PARAM]: product.productNumber,
  });
}

/** A path with the quick view parameter, e.g. `Speisekarte/Pizza/?produkt=21`. */
function isDeepLink(path: string): boolean {
  const query = path.split("?")[1];
  return (
    query !== undefined &&
    new URLSearchParams(query).get(PRODUCT_QUICK_VIEW_PARAM) !== null
  );
}
