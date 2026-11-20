import { describe, expect, it } from "vitest";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../../server/adapters/shopware";
import { formatTimeOfDay, isDomainError } from "../../../shared/domain";

const answering = (answers: Record<string, unknown>): StoreApi => ({
  get: async <T>(path: string) => answers[path] as T,
  post: () => Promise.reject(new Error("no POST")),
});

describe("Shopware ShopPort adapter (anti-corruption)", () => {
  it("reports an unreachable Shopware as backend_unavailable", async () => {
    const shop = createShopwareBackend({
      storeApi: {
        get: () =>
          Promise.reject(
            Object.assign(new Error("[GET] fetch failed"), {
              name: "FetchError",
            }),
          ),
        post: () => Promise.reject(new Error("no POST")),
      },
      storeUrl: "",
    }).shop;
    const failure = await shop.getConfig().catch((error) => error);
    expect(isDomainError(failure, "backend_unavailable")).toBe(true);
  });

  it("treats empty contact fields and a partial address as not configured", async () => {
    const shop = createShopwareBackend({
      storeApi: answering({
        "/shopbite/config": {
          isCheckoutEnabled: true,
          menuCategoryId: "x",
          shippingMethods: [],
          telephone: " ",
          addressStreet: "Musterstraße 1",
          addressPostalCode: null,
          addressCity: "Musterstadt",
        },
      }),
      storeUrl: "",
    }).shop;
    expect(await shop.getConfig()).toEqual({
      acceptsOrders: true,
      telephone: null,
      address: null,
      googleBusinessProfileUrl: null,
    });
  });

  it("drops opening hours rows it cannot read instead of failing", async () => {
    const shop = createShopwareBackend({
      storeApi: answering({
        "/shopbite/business-hour": {
          businessHours: [
            { dayOfWeek: 2, openingTime: "11:30:00", closingTime: "14:30:00" },
            { dayOfWeek: 2, openingTime: "18:00:00", closingTime: "02:00:00" },
            { dayOfWeek: 8, openingTime: "11:00:00", closingTime: "12:00:00" },
            { dayOfWeek: 3 },
          ],
        },
      }),
      storeUrl: "",
    }).shop;
    const { intervals } = await shop.getOpeningHours();
    expect(
      intervals.map(
        ({ weekday, interval }) =>
          `${weekday} ${formatTimeOfDay(interval.opens)}`,
      ),
    ).toEqual(["2 11:30"]);
  });

  it("answers no hours, holidays or branches for an empty plugin answer", async () => {
    const shop = createShopwareBackend({
      storeApi: answering({
        "/shopbite/business-hour": {},
        "/shopbite/holiday": {},
        "/shopbite/multi-channel-group": {},
      }),
      storeUrl: "",
    }).shop;
    expect(await shop.getOpeningHours()).toEqual({ intervals: [] });
    expect(await shop.getHolidays()).toEqual([]);
    expect(await shop.listBranches()).toEqual([]);
  });
});
