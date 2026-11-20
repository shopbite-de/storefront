import {
  openingInterval,
  type Branch,
  type Holiday,
  type OpeningHours,
  type ShopConfig,
  type Weekday,
} from "../../../shared/domain";

/** What the memory adapter's restaurant looks like, in domain terms. */
export type MemorySeed = Readonly<{
  shop: Readonly<{
    config: ShopConfig;
    openingHours: OpeningHours;
    holidays: readonly Holiday[];
    branches: readonly Branch[];
  }>;
}>;

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * The quickstart's demo restaurant: open around the clock every day,
 * placeholder contact data. The demo menu joins with CatalogPort (step 2).
 */
export const DEMO_SEED: MemorySeed = {
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
    },
    openingHours: {
      intervals: WEEK.map((weekday) => ({
        weekday,
        interval: openingInterval("00:00", "24:00"),
      })),
    },
    holidays: [],
    branches: [],
  },
};
