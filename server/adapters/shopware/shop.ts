import type { components } from "../../../api-types/storeApiTypes";
import {
  closingTime,
  deepFreeze,
  DomainError,
  holiday,
  MINUTES_PER_DAY,
  openingInterval,
  sortOpeningHours,
  timeOfDay,
  zonedDateTime,
  type Branch,
  type Holiday,
  type OpeningHours,
  type ShopConfig,
  type TimeZone,
  type Weekday,
  type WeeklyOpeningInterval,
} from "../../../shared/domain";
import type { ShopPort } from "../../ports";
import type { StoreApi } from "./storeApi";

type Schemas = components["schemas"];

/** Reports data the adapter drops because the domain cannot express it. */
export type AdapterLog = (message: string, details: unknown) => void;

/** Any failure of the Store API becomes `backend_unavailable`. */
export async function call<T>(
  what: string,
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (cause) {
    throw new DomainError(
      "backend_unavailable",
      `Shopware did not answer ${what}.`,
      {},
      { cause },
    );
  }
}

const text = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null;

const isWeekday = (value: unknown): value is Weekday =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;

const nextWeekday = (weekday: Weekday) => ((weekday % 7) + 1) as Weekday;

export function toShopConfig(
  config: Schemas["ShopBiteConfig"],
  timeZone: TimeZone,
): ShopConfig {
  const street = text(config.addressStreet);
  const postalCode = text(config.addressPostalCode);
  const city = text(config.addressCity);
  return {
    acceptsOrders: config.isCheckoutEnabled === true,
    timeZone,
    telephone: text(config.telephone),
    address: street && postalCode && city ? { street, postalCode, city } : null,
    googleBusinessProfileUrl: text(config.googleBusinessProfileUrl),
  };
}

/**
 * One plugin row as domain intervals, by the plugin's rule
 * (OrderingWindow): a closing time at or before the opening time runs into
 * the next day, so the row is split at midnight; closing at 00:00 or 24:00
 * is the end of the day, equal times are open around the clock.
 */
function rowIntervals(
  row: Schemas["BusinessHour"],
): WeeklyOpeningInterval[] | null {
  if (!isWeekday(row.dayOfWeek) || !row.openingTime || !row.closingTime) {
    return null;
  }
  try {
    const opens = timeOfDay(row.openingTime);
    const closes = closingTime(row.closingTime);
    if (closes.minutes > opens.minutes) {
      return [
        { weekday: row.dayOfWeek, interval: openingInterval(opens, closes) },
      ];
    }
    const intervals: WeeklyOpeningInterval[] = [
      {
        weekday: row.dayOfWeek,
        interval: openingInterval(opens, closingTime(MINUTES_PER_DAY)),
      },
    ];
    const tomorrow = closes.minutes % MINUTES_PER_DAY;
    if (tomorrow > 0) {
      intervals.push({
        weekday: nextWeekday(row.dayOfWeek),
        interval: openingInterval(timeOfDay(0), closingTime(tomorrow)),
      });
    }
    return intervals;
  } catch {
    return null;
  }
}

export function toOpeningHours(
  hours: Schemas["BusinessHourStruct"],
  log: AdapterLog,
): OpeningHours {
  return sortOpeningHours(
    (hours.businessHours ?? []).flatMap((row) => {
      const intervals = rowIntervals(row);
      if (!intervals) {
        log("Shopware: dropped an opening hours row it cannot read.", row);
      }
      return intervals ?? [];
    }),
  );
}

/**
 * Holidays as whole days in the restaurant's time zone, like the plugin
 * reads them (the date of start and end there, both included).
 */
export function toHolidays(
  holidays: Schemas["HolidayStruct"],
  timeZone: TimeZone,
  log: AdapterLog,
): Holiday[] {
  return (holidays.holidays ?? []).flatMap((entry) => {
    const start = Date.parse(entry.start ?? "");
    const end = Date.parse(entry.end ?? "");
    try {
      if (!entry.id || Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error("incomplete");
      }
      return [
        holiday({
          id: entry.id,
          firstDay: zonedDateTime(new Date(start), timeZone).date,
          lastDay: zonedDateTime(new Date(end), timeZone).date,
        }),
      ];
    } catch {
      log("Shopware: dropped a holiday it cannot read.", entry);
      return [];
    }
  });
}

/**
 * The sales channels of the multi-channel group are the branches; each
 * one's URL is its domain equal to this storefront's URL, else its first
 * (like `SalesChannelSwitch`). Channels without a domain are left out.
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
 * stays in the server routes around the port (ADR 0001). The plugin does
 * not report a time zone; it comes from the storefront's configuration.
 */
export function createShopwareShop(
  storeApi: StoreApi,
  options: Readonly<{ storeUrl: string; timeZone: TimeZone; log: AdapterLog }>,
): ShopPort {
  const { storeUrl, timeZone, log } = options;
  const get = <T>(path: string) => call(path, () => storeApi.get<T>(path));
  return {
    getConfig: async () =>
      deepFreeze(
        toShopConfig(
          await get<Schemas["ShopBiteConfig"]>("/shopbite/config"),
          timeZone,
        ),
      ),
    getOpeningHours: async () =>
      deepFreeze(
        toOpeningHours(
          await get<Schemas["BusinessHourStruct"]>("/shopbite/business-hour"),
          log,
        ),
      ),
    getHolidays: async () =>
      deepFreeze(
        toHolidays(
          await get<Schemas["HolidayStruct"]>("/shopbite/holiday"),
          timeZone,
          log,
        ),
      ),
    listBranches: async () =>
      deepFreeze(
        toBranches(
          await get<Schemas["MultiChannelGroupStruct"]>(
            "/shopbite/multi-channel-group",
          ),
          storeUrl,
        ),
      ),
  };
}
