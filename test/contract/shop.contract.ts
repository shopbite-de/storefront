import { expect, it } from "vitest";
import {
  formatTimeOfDay,
  type Branch,
  type Holiday,
  type ShopConfig,
} from "../../shared/domain";
import { defineContract } from "./harness";

/** A restaurant as the ShopPort suite describes it, in domain terms. */
export type ShopScenario = Readonly<{
  config: ShopConfig;
  /** Weekday → intervals as `HH:MM–HH:MM`, any order. */
  /**
   * Weekday → intervals as `HH:MM–HH:MM`, any order. `24:00` is the end of
   * the day; a late-night opening is `…–24:00` plus `00:00–…` next day.
   */
  hours: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string[]>>>;
  holidays: readonly Holiday[];
  /** This storefront's URL, for `Branch.current`. */
  storeUrl: string;
  branches: readonly Omit<Branch, "current">[];
}>;

export const RESTAURANT: ShopScenario = {
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
  hours: {
    1: [],
    2: ["17:30–23:00", "11:30–14:30"],
    3: ["11:30–14:30", "17:30–23:00"],
    // Friday evening runs into Saturday (one overnight row in Shopware)
    5: ["11:30–14:30", "17:00–24:00"],
    6: ["00:00–01:30", "17:00–23:59"],
    // up to the end of the day, nothing after midnight
    7: ["12:00–24:00"],
  },
  holidays: [
    { id: "summer-break", firstDay: "2026-07-20", lastDay: "2026-08-02" },
    { id: "christmas", firstDay: "2026-12-24", lastDay: "2026-12-26" },
  ],
  storeUrl: "https://nord.example.com",
  branches: [
    { id: "north", name: "Musterstadt Nord", url: "https://nord.example.com" },
    { id: "south", name: "Musterstadt Süd", url: "https://sued.example.com" },
  ],
};

export const shopContract = defineContract<"shop", ShopScenario>(
  "shop",
  (given) => {
    it("answers the restaurant's configuration", async () => {
      const shop = await given(RESTAURANT);
      expect(await shop.getConfig()).toEqual(RESTAURANT.config);
    });

    it("says when the restaurant does not accept orders", async () => {
      const shop = await given({
        ...RESTAURANT,
        config: { ...RESTAURANT.config, acceptsOrders: false },
      });
      expect((await shop.getConfig()).acceptsOrders).toBe(false);
    });

    it("leaves out contact data the restaurant has not configured", async () => {
      const shop = await given({
        ...RESTAURANT,
        config: {
          acceptsOrders: true,
          timeZone: "Europe/Berlin",
          telephone: null,
          address: null,
          googleBusinessProfileUrl: null,
        },
      });
      expect(await shop.getConfig()).toEqual({
        acceptsOrders: true,
        timeZone: "Europe/Berlin",
        telephone: null,
        address: null,
        googleBusinessProfileUrl: null,
      });
    });

    it("answers the opening hours by weekday, intervals in time order", async () => {
      const shop = await given(RESTAURANT);
      const { intervals } = await shop.getOpeningHours();
      const written = intervals.map(
        ({ weekday, interval }) =>
          `${weekday} ${formatTimeOfDay(interval.opens)}–${formatTimeOfDay(interval.closes)}`,
      );
      expect(written).toEqual([
        "2 11:30–14:30",
        "2 17:30–23:00",
        "3 11:30–14:30",
        "3 17:30–23:00",
        "5 11:30–14:30",
        "5 17:00–24:00",
        "6 00:00–01:30",
        "6 17:00–23:59",
        "7 12:00–24:00",
      ]);
    });

    it("has no intervals on a weekly closing day", async () => {
      const shop = await given(RESTAURANT);
      const { intervals } = await shop.getOpeningHours();
      expect(intervals.filter(({ weekday }) => weekday === 1)).toEqual([]);
      expect(intervals.filter(({ weekday }) => weekday === 4)).toEqual([]);
    });

    it("answers the holidays as whole days", async () => {
      const shop = await given(RESTAURANT);
      expect(await shop.getHolidays()).toEqual(RESTAURANT.holidays);
    });

    it("answers the branches and marks this storefront's", async () => {
      const shop = await given(RESTAURANT);
      expect(await shop.listBranches()).toEqual([
        { ...RESTAURANT.branches[0], current: true },
        { ...RESTAURANT.branches[1], current: false },
      ]);
    });

    it("answers values a caller cannot change", async () => {
      const shop = await given(RESTAURANT);
      expect(Object.isFrozen(await shop.getConfig())).toBe(true);
      expect(Object.isFrozen((await shop.getOpeningHours()).intervals)).toBe(
        true,
      );
      expect(Object.isFrozen((await shop.getHolidays())[0])).toBe(true);
      expect(Object.isFrozen(await shop.listBranches())).toBe(true);
    });

    it("has no branches for a single location", async () => {
      const shop = await given({ ...RESTAURANT, branches: [] });
      expect(await shop.listBranches()).toEqual([]);
    });
  },
);
