import type { Money, ShopConfig } from "../../shared/domain";
import { moneyAmount } from "../utils/money";
import { SHOP_CONFIG_KEY } from "./useShopConfig";

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
 * The shop-wide currency and locale are the shop's (`ShopConfig.currency`
 * and `locale`, ADR 0001 step 7), which the server renders from its cache
 * and hands over in the payload (`useShopConfig`, app.vue), so server render
 * and client hydration always format identically, never by the visitor's
 * browser locale. `setPriceConfig` overrides them for the whole app
 * (`useState`); `params` for one caller.
 */
export function useCommercePrice(params?: Partial<CommercePriceConfig>) {
  const config = useState<Partial<CommercePriceConfig>>(
    "commerce-price-config",
    () => ({}),
  );
  const shop = useNuxtData<ShopConfig | null>(SHOP_CONFIG_KEY).data;

  function setPriceConfig(update: Partial<CommercePriceConfig>) {
    config.value = {
      currencyCode: update.currencyCode || config.value.currencyCode,
      localeCode: update.localeCode || config.value.localeCode,
    };
  }

  const currencyCode = computed(
    () =>
      params?.currencyCode ??
      config.value.currencyCode ??
      shop.value?.currency ??
      DEFAULT_CONFIG.currencyCode,
  );
  const localeCode = computed(
    () =>
      params?.localeCode ??
      config.value.localeCode ??
      shop.value?.locale ??
      DEFAULT_CONFIG.localeCode,
  );

  // Memoized: constructing Intl.NumberFormat is expensive and listing pages
  // format many prices per render.
  const formatter = computed(
    () =>
      new Intl.NumberFormat(localeCode.value, {
        style: "currency",
        currency: currencyCode.value,
      }),
  );

  function getFormattedPrice(value: number | string | undefined): string {
    if (value === undefined) {
      return "";
    }
    return formatter.value.format(+value);
  }

  // One formatter per currency other than the shop's (rare).
  const otherFormatters = new Map<string, Intl.NumberFormat>();

  /** A price of the domain (Money) in its own currency. */
  function getFormattedMoney(value: Money | null | undefined): string {
    if (!value) return "";
    if (value.currency === currencyCode.value) {
      return formatter.value.format(moneyAmount(value));
    }
    let other = otherFormatters.get(value.currency);
    if (!other) {
      other = new Intl.NumberFormat(localeCode.value, {
        style: "currency",
        currency: value.currency,
      });
      otherFormatters.set(value.currency, other);
    }
    return other.format(moneyAmount(value));
  }

  return {
    getFormattedPrice,
    getFormattedMoney,
    setPriceConfig,
    currencyCode,
    localeCode,
  };
}
