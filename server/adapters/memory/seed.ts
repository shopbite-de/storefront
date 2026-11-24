import {
  leadTime,
  openingInterval,
  type Branch,
  type ContactForm,
  type Country,
  type Holiday,
  type OpeningHours,
  type PaymentMethod,
  type ShippingMethod,
  type ShopConfig,
  type Weekday,
} from "../../../shared/domain";
import type { MemoryVoucher } from "./cart";
import type { MemoryCatalog } from "./catalog";
import { resolveShopLocale, type ShopLocale } from "../../../i18n/shopLocale";
import { demoLocale } from "./demoLocale";
import { demoMenu } from "./demoMenu";
import { demoNavigation } from "./demoNavigation";
import type { MemoryNavigation } from "./navigation";

/** What the memory adapter's restaurant looks like, in domain terms. */
export type MemorySeed = Readonly<{
  shop: Readonly<{
    config: ShopConfig;
    openingHours: OpeningHours;
    holidays: readonly Holiday[];
    branches: readonly Branch[];
  }>;
  checkout: Readonly<{
    /** In the shop's order; the first is selected for a new visitor. */
    shippingMethods: readonly ShippingMethod[];
    /** In the shop's order; none without (no order can be placed). */
    paymentMethods?: readonly PaymentMethod[];
  }>;
  catalog: MemoryCatalog;
  navigation: MemoryNavigation;
  /**
   * Vouchers the cart accepts (none without) and its text for a code it
   * does not know (German without).
   */
  cart?: Readonly<{
    vouchers: readonly MemoryVoucher[];
    unknownVoucher?: (code: string) => string;
  }>;
  /**
   * Accounts: double opt-in for new ones (off without); the countries an
   * address may have, with their names (Germany, Austria, Switzerland in
   * German without).
   */
  customer?: Readonly<{
    doubleOptIn?: boolean;
    countries?: readonly Country[];
  }>;
  /**
   * The contact form: the restaurant's own confirmation (none without) and
   * the fields it requires beside e-mail, subject and message.
   */
  contact?: Readonly<{
    confirmation?: string | null;
    required?: Partial<ContactForm["required"]>;
  }>;
}>;

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * The quickstart's demo restaurant: open 00:00–23:59 every day (like the
 * quickstart's opening hours),
 * placeholder contact data, delivery in about 30 and pickup in about 15
 * minutes, and the quickstart's demo menu (`demoMenu.ts`).
 */
const demos = new Map<string, MemorySeed>();

/** The shop's locale as far as the demo restaurant needs it. */
export type DemoSeedLocale = Pick<
  ShopLocale,
  "code" | "pagePaths" | "contentPaths"
>;

/**
 * The demo restaurant, built on first use: a storefront on another backend
 * never builds the demo menu. Its shop setup (shipping and payment
 * methods, sortings, navigation) is in the shop's locale (ADR 0002,
 * `demoLocale.ts`), German by default.
 */
export function demoSeed(
  locale: DemoSeedLocale = resolveShopLocale({}, {}),
): MemorySeed {
  const key = JSON.stringify(locale);
  let demo = demos.get(key);
  if (!demo) {
    demo = buildDemoSeed(locale);
    demos.set(key, demo);
  }
  return demo;
}

const buildDemoSeed = (locale: DemoSeedLocale): MemorySeed => {
  const words = demoLocale(locale.code);
  const catalog = demoMenu(words);
  return {
    shop: {
      config: {
        acceptsOrders: true,
        timeZone: "Europe/Berlin",
        telephone: "+49 123 456789",
        address: { ...words.address },
        googleBusinessProfileUrl: null,
        currency: "EUR",
        locale: words.language,
      },
      openingHours: {
        intervals: WEEK.map((weekday) => ({
          weekday,
          interval: openingInterval("00:00", "23:59"),
        })),
      },
      holidays: [],
      branches: [],
    },
    checkout: {
      shippingMethods: [
        {
          id: "delivery",
          name: words.shipping.delivery,
          description: null,
          fulfillment: "delivery",
          leadTime: leadTime(30),
          media: null,
        },
        {
          id: "pickup",
          name: words.shipping.pickup,
          description: null,
          fulfillment: "pickup",
          leadTime: leadTime(15),
          media: null,
        },
      ],
      paymentMethods: [
        {
          id: "cash",
          name: words.payment.cash.name,
          description: words.payment.cash.description,
          media: null,
          redirects: false,
          preferred: true,
        },
        {
          id: "card",
          name: words.payment.card.name,
          description: words.payment.card.description,
          media: null,
          redirects: false,
          preferred: false,
        },
      ],
    },
    catalog,
    navigation: demoNavigation(catalog, words, locale),
    cart: { vouchers: [], unknownVoucher: words.unknownVoucher },
    customer: {
      countries: (["DE", "AT", "CH"] as const).map((code) => ({
        code,
        name: words.countries[code],
      })),
    },
  };
};
