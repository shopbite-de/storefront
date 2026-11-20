import type { components } from "../../../api-types/storeApiTypes";
import {
  DomainError,
  openingInterval,
  type Branch,
  type Holiday,
  type OpeningHours,
  type ShopConfig,
  type Weekday,
} from "../../../shared/domain";
import type { ShopPort } from "../../ports";
import type { StoreApi } from "./storeApi";

type Schemas = components["schemas"];

/** Any failure of the Store API becomes `backend_unavailable`. */
async function call<T>(what: string, request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (cause) {
    const error = new DomainError(
      "backend_unavailable",
      `Shopware did not answer ${what}.`,
    );
    (error as { cause?: unknown }).cause = cause;
    throw error;
  }
}

const text = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null;

const isWeekday = (value: unknown): value is Weekday =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;

export function toShopConfig(config: Schemas["ShopBiteConfig"]): ShopConfig {
  const street = text(config.addressStreet);
  const postalCode = text(config.addressPostalCode);
  const city = text(config.addressCity);
  return {
    acceptsOrders: config.isCheckoutEnabled === true,
    telephone: text(config.telephone),
    address: street && postalCode && city ? { street, postalCode, city } : null,
    googleBusinessProfileUrl: text(config.googleBusinessProfileUrl),
  };
}

/**
 * Rows the domain cannot express (unknown weekday, missing time, closing
 * before opening) are left out, like the storefront ignores them today.
 */
export function toOpeningHours(
  hours: Schemas["BusinessHourStruct"],
): OpeningHours {
  const intervals = (hours.businessHours ?? []).flatMap((row) => {
    if (!isWeekday(row.dayOfWeek) || !row.openingTime || !row.closingTime) {
      return [];
    }
    try {
      return [
        {
          weekday: row.dayOfWeek,
          interval: openingInterval(
            row.openingTime.slice(0, 5),
            row.closingTime.slice(0, 5),
          ),
        },
      ];
    } catch {
      return [];
    }
  });
  intervals.sort(
    (a, b) =>
      a.weekday - b.weekday ||
      a.interval.opens.minutes - b.interval.opens.minutes,
  );
  return { intervals };
}

export function toHolidays(holidays: Schemas["HolidayStruct"]): Holiday[] {
  return (holidays.holidays ?? []).flatMap((holiday) =>
    holiday.id && holiday.start && holiday.end
      ? [{ id: holiday.id, start: holiday.start, end: holiday.end }]
      : [],
  );
}

/**
 * The sales channels of the multi-channel group are the branches; each
 * one's URL is its domain, the one equal to this storefront's URL if it has
 * several (like `SalesChannelSwitch`).
 */
export function toBranches(
  groups: Schemas["MultiChannelGroupStruct"],
  storeUrl: string,
): Branch[] {
  const channels = groups.multiChannelGroup?.[0]?.salesChannels ?? [];
  return channels.flatMap((channel) => {
    const urls = (channel.domains ?? [])
      .map((domain) => domain?.url)
      .filter((url): url is string => Boolean(url));
    const url = urls.find((candidate) => candidate === storeUrl) ?? urls[0];
    if (!channel.id || !url) return [];
    return [
      {
        id: channel.id,
        name: channel.name ?? "",
        url,
        current: url === storeUrl,
      },
    ];
  });
}

/**
 * ShopPort over the ShopBite plugin. No caching or backoff here: that
 * stays in the server routes around the port (ADR 0001).
 */
export function createShopwareShop(
  storeApi: StoreApi,
  storeUrl: string,
): ShopPort {
  return {
    getConfig: async () =>
      toShopConfig(
        await call("/shopbite/config", () =>
          storeApi.get<Schemas["ShopBiteConfig"]>("/shopbite/config"),
        ),
      ),
    getOpeningHours: async () =>
      toOpeningHours(
        await call("/shopbite/business-hour", () =>
          storeApi.get<Schemas["BusinessHourStruct"]>(
            "/shopbite/business-hour",
          ),
        ),
      ),
    getHolidays: async () =>
      toHolidays(
        await call("/shopbite/holiday", () =>
          storeApi.get<Schemas["HolidayStruct"]>("/shopbite/holiday"),
        ),
      ),
    listBranches: async () =>
      toBranches(
        await call("/shopbite/multi-channel-group", () =>
          storeApi.get<Schemas["MultiChannelGroupStruct"]>(
            "/shopbite/multi-channel-group",
          ),
        ),
        storeUrl,
      ),
  };
}
