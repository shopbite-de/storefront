import { withLeadingSlash, withQuery } from "ufo";

/** Query parameter that holds the product number of the open quick view. */
export const PRODUCT_QUICK_VIEW_PARAM = "produkt";

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
