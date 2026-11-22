import {
  leadTime,
  openingInterval,
  type Branch,
  type Holiday,
  type OpeningHours,
  type PaymentMethod,
  type ShippingMethod,
  type ShopConfig,
  type Weekday,
} from "../../../shared/domain";
import type { MemoryVoucher } from "./cart";
import type { MemoryCatalog } from "./catalog";
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
  /** Vouchers the cart accepts; none without. */
  cart?: Readonly<{ vouchers: readonly MemoryVoucher[] }>;
  /** Accounts: double opt-in for new ones (off without). */
  customer?: Readonly<{ doubleOptIn?: boolean }>;
  /** The restaurant's own confirmation of a contact message (none without). */
  contact?: Readonly<{ confirmation?: string | null }>;
}>;

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * The quickstart's demo restaurant: open 00:00–23:59 every day (like the
 * quickstart's opening hours),
 * placeholder contact data, delivery in about 30 and pickup in about 15
 * minutes, and the quickstart's demo menu (`demoMenu.ts`).
 */
let demo: MemorySeed | undefined;

/**
 * The demo restaurant, built on first use: a storefront on another backend
 * never builds the demo menu.
 */
export function demoSeed(): MemorySeed {
  demo ??= buildDemoSeed();
  return demo;
}

const withNavigation = (catalog: MemoryCatalog) => ({
  catalog,
  navigation: demoNavigation(catalog),
});

const buildDemoSeed = (): MemorySeed => ({
  shop: {
    config: {
      acceptsOrders: true,
      timeZone: "Europe/Berlin",
      telephone: "+49 123 456789",
      address: {
        street: "Musterstraße 1",
        postalCode: "12345",
        city: "Musterstadt",
      },
      googleBusinessProfileUrl: null,
      currency: "EUR",
      locale: "de-DE",
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
        name: "Lieferung",
        description: null,
        fulfillment: "delivery",
        leadTime: leadTime(30),
        media: null,
      },
      {
        id: "pickup",
        name: "Abholung",
        description: null,
        fulfillment: "pickup",
        leadTime: leadTime(15),
        media: null,
      },
    ],
    paymentMethods: [
      {
        id: "cash",
        name: "Barzahlung",
        description: "Bar bei Lieferung oder Abholung",
        media: null,
        redirects: false,
        preferred: true,
      },
      {
        id: "card",
        name: "Kartenzahlung",
        description: "Mit Karte bei Lieferung oder Abholung",
        media: null,
        redirects: false,
        preferred: false,
      },
    ],
  },
  ...withNavigation(demoMenu()),
});
