import { createMemoryBackend, demoSeed } from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../server/adapters/shopware";
import {
  holiday,
  leadTime,
  openingInterval,
  zonedDateTime,
  type Weekday,
} from "../../shared/domain";
import type { CheckoutScenario } from "./checkout.contract";
import type { AdapterFixture } from "./harness";
import type { ShopScenario } from "./shop.contract";

type Row = { weekday: Weekday; opens: string; closes: string };

function intervalsOf(scenario: ShopScenario): Row[] {
  return Object.entries(scenario.hours).flatMap(([weekday, intervals]) =>
    (intervals ?? []).map((written) => {
      const [opens, closes] = written.split("–") as [string, string];
      return { weekday: Number(weekday) as Weekday, opens, closes };
    }),
  );
}

/** The memory adapter, seeded with the scenario. */
export const memoryShop: AdapterFixture<ShopScenario> = {
  adapter: "memory",
  create: (scenario) =>
    createMemoryBackend({
      shop: {
        config: scenario.config,
        openingHours: {
          intervals: intervalsOf(scenario).map(
            ({ weekday, opens, closes }) => ({
              weekday,
              interval: openingInterval(opens, closes),
            }),
          ),
        },
        holidays: scenario.holidays.map(holiday),
        branches: scenario.branches.map((branch) => ({
          ...branch,
          current: branch.url === scenario.storeUrl,
        })),
      },
      checkout: { shippingMethods: [] },
      catalog: demoSeed().catalog,
      navigation: demoSeed().navigation,
    }),
};

/**
 * Business hour rows as the ShopBite plugin keeps them: an interval up to
 * 24:00 followed by one from 00:00 the next weekday is one overnight row
 * (closing before opening); 24:00 alone is written 00:00.
 */
function pluginRows(rows: Row[]): Row[] {
  const next = (weekday: Weekday) => ((weekday % 7) + 1) as Weekday;
  const merged: Row[] = [];
  const used = new Set<Row>();
  for (const row of rows) {
    if (used.has(row)) continue;
    if (row.closes === "24:00") {
      const after = rows.find(
        (other) =>
          other.weekday === next(row.weekday) &&
          other.opens === "00:00" &&
          !used.has(other),
      );
      if (after) used.add(after);
      merged.push({ ...row, closes: after ? after.closes : "00:00" });
    } else {
      merged.push(row);
    }
    used.add(row);
  }
  return merged;
}

/** The UTC instant of a wall-clock time in a time zone. */
function instant(date: string, time: string, timeZone: string): string {
  const wanted = Date.parse(`${date}T${time}Z`);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const zoned = zonedDateTime(new Date(guess), timeZone);
    const seen = Date.parse(
      `${zoned.date}T${String(Math.floor(zoned.time.minutes / 60)).padStart(2, "0")}:${String(zoned.time.minutes % 60).padStart(2, "0")}:${time.slice(6) || "00"}Z`,
    );
    guess += wanted - seen;
  }
  return new Date(guess).toISOString();
}

/**
 * The Shopware adapter against a fake Store API that answers the scenario
 * as the ShopBite plugin does (`HH:MM` times, overnight rows, holidays as
 * instants, `null` for unset fields).
 */
export const shopwareShop: AdapterFixture<ShopScenario> = {
  adapter: "shopware",
  create: (scenario) => {
    const { config } = scenario;
    const answers: Record<string, unknown> = {
      "/shopbite/config": {
        isCheckoutEnabled: config.acceptsOrders,
        menuCategoryId: "018dadb399837af3aa669c8fff4f4d6c",
        shippingMethods: [],
        telephone: config.telephone,
        addressStreet: config.address?.street ?? null,
        addressPostalCode: config.address?.postalCode ?? null,
        addressCity: config.address?.city ?? null,
        googleBusinessProfileUrl: config.googleBusinessProfileUrl,
      },
      // the sales channel's context without a visitor: currency, language
      "/context": {
        currency: { isoCode: config.currency },
        languageInfo: { name: "Deutsch", localeCode: config.locale },
      },
      "/shopbite/business-hour": {
        // reversed: the plugin does not promise an order
        businessHours: pluginRows(intervalsOf(scenario))
          .reverse()
          .map(({ weekday, opens, closes }, index) => ({
            id: `bh${index}`,
            dayOfWeek: weekday,
            openingTime: opens,
            closingTime: closes,
            translated: [],
          })),
      },
      "/shopbite/holiday": {
        holidays: scenario.holidays.map((entry) => ({
          id: entry.id,
          start: instant(entry.firstDay, "00:00:00", config.timeZone),
          end: instant(entry.lastDay, "23:59:59", config.timeZone),
          salesChannelId: "sc",
          translated: [],
        })),
      },
      "/shopbite/multi-channel-group": {
        multiChannelGroup: scenario.branches.length
          ? [
              {
                id: "group",
                name: "Musterstadt",
                translated: [],
                salesChannels: scenario.branches.map((branch, index) => ({
                  id: branch.id,
                  name: branch.name,
                  // the first branch lists this storefront's domain second
                  domains:
                    index === 0
                      ? [{ url: `${branch.url}/en` }, { url: branch.url }]
                      : [{ url: branch.url }],
                })),
              },
            ]
          : [],
      },
    };
    const storeApi: StoreApi = {
      get: async <T>(path: string) => {
        if (!(path in answers)) throw new Error(`unexpected GET ${path}`);
        return structuredClone(answers[path]) as T;
      },
      post: async (path: string) => {
        throw new Error(`unexpected POST ${path}`);
      },
    };
    return createShopwareBackend({
      storeApi,
      storeUrl: scenario.storeUrl,
      timeZone: config.timeZone,
      log: () => {},
    });
  },
};

/** The memory adapter, seeded with the scenario's shipping methods. */
export const memoryCheckout: AdapterFixture<CheckoutScenario> = {
  adapter: "memory",
  create: (scenario) =>
    createMemoryBackend({
      ...demoSeed(),
      checkout: {
        shippingMethods: scenario.shippingMethods.map((method) => ({
          id: method.id,
          name: method.name,
          description: method.description,
          fulfillment: method.fulfillment,
          leadTime:
            method.leadTimeMinutes === null
              ? null
              : leadTime(method.leadTimeMinutes),
          media: null,
        })),
      },
    }),
};

/**
 * The Shopware adapter against a fake Store API: the ShopBite plugin lists
 * fulfillment and lead time per method (a missing lead time is left out of
 * its entry), the Store API's `/shipping-method` names them in the shop's
 * order. The plugin's list is reversed: its order says nothing.
 */
export const shopwareCheckout: AdapterFixture<CheckoutScenario> = {
  adapter: "shopware",
  create: (scenario) => {
    const config = {
      isCheckoutEnabled: true,
      menuCategoryId: "018dadb399837af3aa669c8fff4f4d6c",
      shippingMethods: scenario.shippingMethods
        .map((method) => ({
          id: method.id,
          fulfillment: method.fulfillment,
          ...(method.leadTimeMinutes === null
            ? {}
            : { leadTimeMinutes: method.leadTimeMinutes }),
        }))
        .reverse(),
    };
    const shippingMethods = {
      total: scenario.shippingMethods.length,
      elements: scenario.shippingMethods.map((method, position) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        position,
        translated: {
          name: method.name,
          description: method.description,
        },
        media: null,
      })),
    };
    const storeApi: StoreApi = {
      get: async <T>(path: string) => {
        if (path !== "/shopbite/config")
          throw new Error(`unexpected GET ${path}`);
        return structuredClone(config) as T;
      },
      post: async <T>(path: string) => {
        if (path !== "/shipping-method") {
          throw new Error(`unexpected POST ${path}`);
        }
        return structuredClone(shippingMethods) as T;
      },
    };
    return createShopwareBackend({
      storeApi,
      storeUrl: "https://nord.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
  },
};
