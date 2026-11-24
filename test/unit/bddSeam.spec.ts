import { describe, expect, it } from "vitest";
import { demoSeed } from "../../server/adapters/memory";
import { wantsTestSeams } from "../../modules/test-seams";
import {
  middayTimeZone,
  parseScenario,
  scenarioShop,
} from "../bdd/seam/scenario";

const localHour = (zone: string, at: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(at);

describe("behaviour test seam: the scenario's restaurant", () => {
  it("reads 12:xx in its time zone at every hour of the day", () => {
    for (let hour = 0; hour < 24; hour++) {
      const at = new Date(Date.UTC(2026, 10, 24, hour, 42));
      expect(localHour(middayTimeZone(at), at), `UTC ${hour}:42`).toBe("12");
    }
  });

  it("is open 10:00–22:00 and takes orders unless the scenario says otherwise", () => {
    const shop = scenarioShop(demoSeed().shop, {}, "Etc/GMT-2");
    expect(shop.config).toMatchObject({
      acceptsOrders: true,
      timeZone: "Etc/GMT-2",
    });
    expect(shop.openingHours.intervals).toHaveLength(7);
    expect(shop.openingHours.intervals[0]!.interval).toMatchObject({
      opens: { minutes: 600 },
      closes: { minutes: 1320 },
    });
    expect(shop.holidays).toEqual([]);
  });

  it("closes all week or pauses ordering when asked", () => {
    const shop = scenarioShop(
      demoSeed().shop,
      { openingHours: null, acceptsOrders: false },
      "Etc/GMT",
    );
    expect(shop.openingHours.intervals).toEqual([]);
    expect(shop.config.acceptsOrders).toBe(false);
  });

  it("refuses scenarios it does not understand", () => {
    expect(parseScenario(undefined)).toEqual({});
    expect(
      parseScenario({ openingHours: { from: "06:00", to: "11:00" } }),
    ).toEqual({
      openingHours: { from: "06:00", to: "11:00" },
      acceptsOrders: undefined,
    });
    expect(() => parseScenario({ clock: "12:00" })).toThrow(
      /Unknown scenario keys: clock/,
    );
    expect(() => parseScenario({ acceptsOrders: "no" })).toThrow(/boolean/);
    expect(() =>
      parseScenario({ openingHours: { from: "6", to: "11:00" } }),
    ).toThrow(/HH:MM/);
    expect(() => parseScenario([])).toThrow(/object/);
  });
});

describe("behaviour test seam: build switch", () => {
  it("is built in only with SHOPBITE_TEST_SEAMS=1", () => {
    expect(wantsTestSeams({})).toBe(false);
    expect(wantsTestSeams({ SHOPBITE_TEST_SEAMS: "" })).toBe(false);
    expect(wantsTestSeams({ SHOPBITE_TEST_SEAMS: "true" })).toBe(false);
    expect(wantsTestSeams({ SHOPBITE_TEST_SEAMS: "1" })).toBe(true);
  });
});
