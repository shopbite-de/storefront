import { createMemoryBackend } from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../server/adapters/shopware";
import { openingInterval, type Weekday } from "../../shared/domain";
import type { AdapterFixture } from "./harness";
import type { ShopScenario } from "./shop.contract";

function intervalsOf(scenario: ShopScenario) {
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
        holidays: scenario.holidays,
        branches: scenario.branches.map((branch) => ({
          ...branch,
          current: branch.url === scenario.storeUrl,
        })),
      },
    }),
};

/**
 * The Shopware adapter against a fake Store API that answers the scenario
 * as the ShopBite plugin does (seconds in times, `null` for unset fields).
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
      "/shopbite/business-hour": {
        // reversed: the plugin does not promise an order
        businessHours: intervalsOf(scenario)
          .reverse()
          .map(({ weekday, opens, closes }, index) => ({
            id: `bh${index}`,
            dayOfWeek: weekday,
            openingTime: `${opens}:00`,
            closingTime: `${closes}:00`,
            translated: [],
          })),
      },
      "/shopbite/holiday": {
        holidays: scenario.holidays.map((holiday) => ({
          ...holiday,
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
                salesChannels: scenario.branches.map((branch) => ({
                  id: branch.id,
                  name: branch.name,
                  // the storefront's domain first, as Shopware lists them
                  domains: [{ url: branch.url }, { url: `${branch.url}/en` }],
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
    return createShopwareBackend({ storeApi, storeUrl: scenario.storeUrl });
  },
};
