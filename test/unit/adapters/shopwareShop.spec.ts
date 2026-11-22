import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type ShopwareBackendOptions,
  type StoreApi,
} from "../../../server/adapters/shopware";
import { formatTimeOfDay, isDomainError } from "../../../shared/domain";

const answering = (answers: Record<string, unknown>): StoreApi => ({
  get: async <T>(path: string) => answers[path] as T,
  post: () => Promise.reject(new Error("no POST")),
});

const shopOf = (options: Partial<ShopwareBackendOptions>) =>
  createShopwareBackend({
    storeApi: answering({}),
    storeUrl: "",
    timeZone: "Europe/Berlin",
    log: () => {},
    ...options,
  }).shop;

const hoursOf = async (
  rows: Record<string, unknown>[],
  log: ShopwareBackendOptions["log"] = () => {},
) => {
  const { intervals } = await shopOf({
    storeApi: answering({ "/shopbite/business-hour": { businessHours: rows } }),
    log,
  }).getOpeningHours();
  return intervals.map(
    ({ weekday, interval }) =>
      `${weekday} ${formatTimeOfDay(interval.opens)}–${formatTimeOfDay(interval.closes)}`,
  );
};

const row = (
  dayOfWeek: unknown,
  openingTime?: string,
  closingTime?: string,
) => ({
  id: `${dayOfWeek}-${openingTime}`,
  dayOfWeek,
  openingTime,
  closingTime,
});

describe("Shopware ShopPort adapter (anti-corruption)", () => {
  it("reports an unreachable Shopware as backend_unavailable with the cause", async () => {
    const cause = Object.assign(new Error("[GET] fetch failed"), {
      name: "FetchError",
    });
    const shop = shopOf({
      storeApi: {
        get: () => Promise.reject(cause),
        post: () => Promise.reject(new Error("no POST")),
      },
    });
    const failure = await shop.getConfig().catch((error) => error);
    expect(isDomainError(failure, "backend_unavailable")).toBe(true);
    expect(failure.cause).toBe(cause);
  });

  it("treats empty contact fields and a partial address as not configured", async () => {
    const shop = shopOf({
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
      timeZone: "Europe/Vienna",
    });
    expect(await shop.getConfig()).toEqual({
      acceptsOrders: true,
      timeZone: "Europe/Vienna",
      telephone: null,
      address: null,
      googleBusinessProfileUrl: null,
      // without a context: the storefront's defaults
      currency: "EUR",
      locale: "de-DE",
    });
  });

  it("takes currency and locale from the sales channel's context, read once a while", async () => {
    const get = vi.fn(
      async (path: string) =>
        ({
          "/shopbite/config": { isCheckoutEnabled: true, shippingMethods: [] },
          "/context": {
            currency: { isoCode: "CHF" },
            languageInfo: { name: "Deutsch", localeCode: "de-CH" },
          },
        })[path],
    );
    const shop = shopOf({
      storeApi: {
        get: get as StoreApi["get"],
        post: () => Promise.reject(new Error("no POST")),
      },
    });

    const config = await shop.getConfig();
    await shop.getConfig();

    expect([config.currency, config.locale]).toEqual(["CHF", "de-CH"]);
    expect(get.mock.calls.filter(([path]) => path === "/context")).toHaveLength(
      1,
    );
    expect(
      get.mock.calls.filter(([path]) => path === "/shopbite/config"),
    ).toHaveLength(2);
  });

  it("splits a row that runs past midnight at midnight (closing at or before opening)", async () => {
    expect(
      await hoursOf([row(2, "18:00", "02:00"), row(7, "20:00", "01:00")]),
    ).toEqual([
      "1 00:00–01:00",
      "2 18:00–24:00",
      "3 00:00–02:00",
      "7 20:00–24:00",
    ]);
  });

  it("reads closing at 00:00 or 24:00 as the end of the day", async () => {
    expect(
      await hoursOf([row(2, "18:00", "00:00"), row(3, "18:00", "24:00")]),
    ).toEqual(["2 18:00–24:00", "3 18:00–24:00"]);
  });

  it("reads equal opening and closing as open around the clock", async () => {
    expect(
      await hoursOf([row(4, "00:00", "00:00"), row(5, "12:00", "12:00")]),
    ).toEqual(["4 00:00–24:00", "5 12:00–24:00", "6 00:00–12:00"]);
  });

  it("accepts times with seconds", async () => {
    expect(await hoursOf([row(2, "11:30:00", "14:30:00")])).toEqual([
      "2 11:30–14:30",
    ]);
  });

  it("logs and drops rows it cannot read", async () => {
    const log = vi.fn();
    expect(
      await hoursOf(
        [
          row(2, "11:30", "14:30"),
          row(8, "11:00", "12:00"),
          row(3),
          row(4, "25:00", "26:00"),
          row(5, "24:00", "02:00"),
        ],
        log,
      ),
    ).toEqual(["2 11:30–14:30"]);
    expect(log).toHaveBeenCalledTimes(4);
    expect(log.mock.calls[0]![0]).toMatch(/opening hours row/);
  });

  it("turns holiday instants into whole days in the restaurant's time zone", async () => {
    const log = vi.fn();
    const shop = shopOf({
      storeApi: answering({
        "/shopbite/holiday": {
          holidays: [
            {
              id: "summer",
              start: "2026-07-19T22:00:00.000+00:00",
              end: "2026-08-02T21:59:59.000+00:00",
            },
            {
              id: "christmas",
              start: "2026-12-24T00:00:00+01:00",
              end: "2026-12-26T23:59:59+01:00",
            },
            { id: "broken", start: "soon", end: "2026-12-26T23:59:59+01:00" },
            {
              id: "backwards",
              start: "2026-12-26T00:00:00+01:00",
              end: "2026-12-24T00:00:00+01:00",
            },
          ],
        },
      }),
      log,
    });
    expect(await shop.getHolidays()).toEqual([
      { id: "summer", firstDay: "2026-07-20", lastDay: "2026-08-02" },
      { id: "christmas", firstDay: "2026-12-24", lastDay: "2026-12-26" },
    ]);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("answers no hours, holidays or branches for an empty plugin answer", async () => {
    const shop = shopOf({
      storeApi: answering({
        "/shopbite/business-hour": {},
        "/shopbite/holiday": {},
        "/shopbite/multi-channel-group": {},
      }),
    });
    expect(await shop.getOpeningHours()).toEqual({ intervals: [] });
    expect(await shop.getHolidays()).toEqual([]);
    expect(await shop.listBranches()).toEqual([]);
  });

  it("answers frozen values", async () => {
    const shop = shopOf({
      storeApi: answering({
        "/shopbite/business-hour": {
          businessHours: [row(2, "11:30", "14:30")],
        },
      }),
    });
    const hours = await shop.getOpeningHours();
    expect(Object.isFrozen(hours.intervals[0])).toBe(true);
  });

  it("answers the configuration with the default price format when the context fails", async () => {
    const log = vi.fn();
    let contextFails = true;
    const get = vi.fn(async (path: string) => {
      if (path === "/context") {
        if (contextFails)
          throw Object.assign(new Error("503"), { statusCode: 503 });
        return {
          currency: { isoCode: "CHF" },
          languageInfo: { localeCode: "de-CH" },
        };
      }
      return { isCheckoutEnabled: true, shippingMethods: [] };
    });
    const shop = shopOf({
      storeApi: {
        get: get as StoreApi["get"],
        post: () => Promise.reject(new Error("no POST")),
      },
      log,
    });

    const config = await shop.getConfig();
    expect(config.acceptsOrders).toBe(true);
    expect([config.currency, config.locale]).toEqual(["EUR", "de-DE"]);
    expect(log).toHaveBeenCalledOnce();

    // the default is not kept: the next read asks the context again
    contextFails = false;
    const next = await shop.getConfig();
    expect([next.currency, next.locale]).toEqual(["CHF", "de-CH"]);
  });
});
