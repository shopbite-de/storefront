import { withLeadingSlash, withQuery } from "ufo";

/** Query parameter that holds the menu number of the open dish sheet. */
export const PRODUCT_QUICK_VIEW_PARAM = "produkt";
/** Deselected main ingredients by name, comma-separated (#411). */
export const WITHOUT_INGREDIENTS_PARAM = "ohne";
/** Selected extras by menu number, comma-separated (#411). */
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

/**
 * The link of a dish (#289): there are no dish pages, a dish is its sheet
 * over a section, `<section>?produkt=<menu number>`. The dish's own path
 * wins when the backend keeps one, so shop owners can change it
 * (shopware-plugin#28); otherwise the link is built from the section the
 * dish is listed in. Undefined without either.
 */
export function dishLink(
  dish: { number: string; path: string | null },
  sectionPath?: string,
): string | undefined {
  if (dish.path) return dish.path;
  if (!sectionPath) return undefined;
  return withQuery(withLeadingSlash(sectionPath), {
    [PRODUCT_QUICK_VIEW_PARAM]: dish.number,
  });
}
