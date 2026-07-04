export interface CommercePriceConfig {
  currencyCode: string;
  localeCode: string;
}

const DEFAULT_CONFIG: CommercePriceConfig = {
  currencyCode: "EUR",
  localeCode: "de-DE",
};

/**
 * Platform-agnostic price formatting.
 *
 * The shop-wide currency/locale is seeded once from the commerce backend's
 * session context (see `app.vue`) via `setPriceConfig` and shared through
 * `useState`, so server render and client hydration always format
 * identically — never based on the visitor's browser locale.
 */
export function useCommercePrice(params?: Partial<CommercePriceConfig>) {
  const config = useState<CommercePriceConfig>("commerce-price-config", () => ({
    ...DEFAULT_CONFIG,
  }));

  function setPriceConfig(update: Partial<CommercePriceConfig>) {
    config.value = {
      currencyCode: update.currencyCode || config.value.currencyCode,
      localeCode: update.localeCode || config.value.localeCode,
    };
  }

  const currencyCode = computed(
    () => params?.currencyCode ?? config.value.currencyCode,
  );
  const localeCode = computed(
    () => params?.localeCode ?? config.value.localeCode,
  );

  function getFormattedPrice(value: number | string | undefined): string {
    if (value === undefined) {
      return "";
    }
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: currencyCode.value,
    }).format(+value);
  }

  return {
    getFormattedPrice,
    setPriceConfig,
    currencyCode,
    localeCode,
  };
}
