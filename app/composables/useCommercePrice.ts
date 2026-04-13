export function useCommercePrice(
  options: { currencyCode?: string; localeCode?: string } = {},
) {
  const { currencyCode = "EUR", localeCode = "de-DE" } = options;

  const getFormattedPrice = (price: number | null | undefined): string => {
    if (price == null) return "";
    return new Intl.NumberFormat(localeCode, {
      style: "currency",
      currency: currencyCode,
    }).format(price);
  };

  return { getFormattedPrice };
}
