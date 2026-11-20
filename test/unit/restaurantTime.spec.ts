import { describe, expect, it } from "vitest";
import {
  firstSlot,
  formatClock,
  formatClosing,
  minutesInWindow,
  restaurantNow,
  servicePeriodsOn,
  serviceSpans,
  storeStatusAt,
  wishedTimeWindow,
} from "../../app/utils/restaurantTime";
import {
  holiday,
  openingInterval,
  sortOpeningHours,
  type ServiceSchedule,
  type Weekday,
} from "../../shared/domain";

const hours = (rows: [Weekday, string, string][]) =>
  sortOpeningHours(
    rows.map(([weekday, opens, closes]) => ({
      weekday,
      interval: openingInterval(opens, closes),
    })),
  );

/**
 * A restaurant in Berlin: lunch and dinner Wednesday to Friday, Friday
 * night until 01:30 (split at midnight like the domain keeps it), Saturday
 * dinner, Sunday until the end of the day, closed Monday and Tuesday.
 */
const SCHEDULE: ServiceSchedule = {
  timeZone: "Europe/Berlin",
  openingHours: hours([
    [3, "11:30", "14:30"],
    [3, "17:30", "23:00"],
    [4, "11:30", "14:30"],
    [4, "17:30", "23:00"],
    [5, "11:30", "14:30"],
    [5, "17:00", "24:00"],
    [6, "00:00", "01:30"],
    [6, "17:00", "23:00"],
    [7, "12:00", "24:00"],
  ]),
  holidays: [],
};

/** A Berlin wall-clock time in November 2026 (UTC+1). */
const berlin = (day: number, time: string) =>
  new Date(`2026-11-${String(day).padStart(2, "0")}T${time}:00+01:00`);
// 2026-11-18 is a Wednesday, 20 a Friday, 21 a Saturday, 23 a Monday.

describe("restaurantNow", () => {
  it("reads date, weekday and time in the restaurant's time zone", () => {
    // 23:30 UTC on Friday is already Saturday 00:30 in Berlin
    expect(
      restaurantNow(new Date("2026-11-20T23:30:00Z"), "Europe/Berlin"),
    ).toEqual({ date: "2026-11-21", weekday: 6, minutes: 30 });
    expect(
      restaurantNow(new Date("2026-11-20T23:30:00Z"), "America/New_York"),
    ).toEqual({ date: "2026-11-20", weekday: 5, minutes: 18 * 60 + 30 });
  });
});

describe("serviceSpans", () => {
  it("joins a late-night opening that the domain split at midnight", () => {
    expect(serviceSpans(SCHEDULE.openingHours, 5)).toEqual([
      { opens: 690, closes: 870 },
      { opens: 1020, closes: 1440 + 90 },
    ]);
    // the continuation is Friday's, not an opening of its own on Saturday
    expect(serviceSpans(SCHEDULE.openingHours, 6)).toEqual([
      { opens: 1020, closes: 1380 },
    ]);
  });

  it("keeps an interval up to 24:00 without continuation as it is", () => {
    expect(serviceSpans(SCHEDULE.openingHours, 7)).toEqual([
      { opens: 720, closes: 1440 },
    ]);
  });

  it("does not join days that are open around the clock", () => {
    const always = hours(
      ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => [
        day,
        "00:00",
        "24:00",
      ]),
    );
    expect(serviceSpans(always, 3)).toEqual([{ opens: 0, closes: 1440 }]);
  });
});

describe("servicePeriodsOn", () => {
  it("carries yesterday's late-night span over midnight", () => {
    expect(servicePeriodsOn(SCHEDULE, "2026-11-21")).toEqual([
      { opens: -420, closes: 90 },
      { opens: 1020, closes: 1380 },
    ]);
  });

  it("serves nothing on a holiday, and not yesterday's span after a holiday", () => {
    const friday = {
      ...SCHEDULE,
      holidays: [
        holiday({ id: "h", firstDay: "2026-11-20", lastDay: "2026-11-20" }),
      ],
    };
    expect(servicePeriodsOn(friday, "2026-11-20")).toEqual([]);
    expect(servicePeriodsOn(friday, "2026-11-21")).toEqual([
      { opens: 1020, closes: 1380 },
    ]);
  });
});

describe("storeStatusAt", () => {
  it("is open until the end of the current span", () => {
    expect(storeStatusAt(berlin(18, "12:30"), SCHEDULE)).toEqual({
      open: true,
      closesAt: "14:30",
    });
  });

  it("closes a late-night span after midnight", () => {
    expect(storeStatusAt(berlin(20, "23:00"), SCHEDULE)).toEqual({
      open: true,
      closesAt: "01:30",
    });
    expect(storeStatusAt(berlin(21, "00:45"), SCHEDULE)).toEqual({
      open: true,
      closesAt: "01:30",
    });
  });

  it("says 24:00 for a span up to the end of the day", () => {
    expect(storeStatusAt(berlin(22, "20:00"), SCHEDULE)).toEqual({
      open: true,
      closesAt: "24:00",
    });
  });

  it("names the next opening today, tomorrow or later", () => {
    expect(storeStatusAt(berlin(18, "15:00"), SCHEDULE)).toEqual({
      open: false,
      nextOpening: "17:30 Uhr",
    });
    expect(storeStatusAt(berlin(18, "23:30"), SCHEDULE)).toEqual({
      open: false,
      nextOpening: "morgen um 11:30 Uhr",
    });
    expect(storeStatusAt(berlin(23, "10:00"), SCHEDULE)).toEqual({
      open: false,
      nextOpening: "Mittwoch, 25.11. um 11:30 Uhr",
    });
  });

  it("skips holidays", () => {
    const schedule = {
      ...SCHEDULE,
      holidays: [
        holiday({ id: "h", firstDay: "2026-11-18", lastDay: "2026-11-19" }),
      ],
    };
    expect(storeStatusAt(berlin(18, "12:30"), schedule)).toEqual({
      open: false,
      nextOpening: "Freitag, 20.11. um 11:30 Uhr",
    });
  });

  it("decides by the restaurant's clock, not the visitor's", () => {
    // 12:30 in Berlin is 06:30 in New York: open in Berlin
    const instant = berlin(18, "12:30");
    expect(storeStatusAt(instant, SCHEDULE).open).toBe(true);
    expect(
      storeStatusAt(instant, { ...SCHEDULE, timeZone: "America/New_York" })
        .open,
    ).toBe(false);
  });
});

describe("wishedTimeWindow", () => {
  it("starts at now plus the lead time within the current span", () => {
    expect(wishedTimeWindow(berlin(18, "12:00"), SCHEDULE, 30)).toEqual({
      kind: "open",
      ready: 750,
      span: { opens: 690, closes: 870 },
      earliest: 750,
      latest: 870,
    });
  });

  it("assumes 30 minutes without a lead time", () => {
    const window = wishedTimeWindow(berlin(18, "12:00"), SCHEDULE, null);
    expect(window).toMatchObject({ kind: "open", earliest: 750 });
  });

  it("offers the next span of today before it opens", () => {
    expect(wishedTimeWindow(berlin(18, "15:00"), SCHEDULE, 30)).toMatchObject({
      kind: "open",
      earliest: 1050,
      latest: 1380,
    });
  });

  it("runs past midnight in a late-night span", () => {
    expect(wishedTimeWindow(berlin(20, "23:50"), SCHEDULE, 30)).toMatchObject({
      kind: "open",
      earliest: 1440 + 20,
      latest: 1440 + 90,
    });
    expect(wishedTimeWindow(berlin(21, "00:30"), SCHEDULE, 30)).toMatchObject({
      kind: "open",
      earliest: 60,
      latest: 90,
    });
  });

  it("has nothing left once the last span ends before the order is ready", () => {
    expect(wishedTimeWindow(berlin(18, "22:45"), SCHEDULE, 30)).toEqual({
      kind: "none_left",
    });
  });

  it("knows weekly closing days and holidays", () => {
    expect(wishedTimeWindow(berlin(23, "12:00"), SCHEDULE, 30)).toEqual({
      kind: "closing_day",
      weekday: 1,
    });
    const schedule = {
      ...SCHEDULE,
      holidays: [
        holiday({ id: "h", firstDay: "2026-11-18", lastDay: "2026-11-18" }),
      ],
    };
    expect(wishedTimeWindow(berlin(18, "12:00"), schedule, 30)).toEqual({
      kind: "holiday",
    });
  });

  it("offers no pre-order for the next day", () => {
    // Wednesday 23:30: the plugin refuses an order for Thursday's lunch
    expect(wishedTimeWindow(berlin(18, "23:30"), SCHEDULE, 30).kind).toBe(
      "none_left",
    );
  });
});

describe("slots", () => {
  it("rounds the first slot up to the 5-minute grid", () => {
    expect(firstSlot(763, 870)).toBe(765);
    expect(firstSlot(765, 870)).toBe(765);
  });

  it("takes the last slot before the end when rounding passes it", () => {
    expect(firstSlot(868, 871)).toBe(870);
    expect(firstSlot(867, 869)).toBeNull();
  });

  it("reads a time after midnight in a window that runs past it", () => {
    expect(minutesInWindow("00:30", 1410, 1530)).toBe(1470);
    expect(minutesInWindow("23:45", 1410, 1530)).toBe(1425);
    // outside: the nearer end decides
    expect(minutesInWindow("02:00", 1410, 1530)).toBe(1440 + 120);
    expect(minutesInWindow("22:00", 1410, 1530)).toBe(1320);
    expect(minutesInWindow("12:00", 690, 870)).toBe(720);
    expect(minutesInWindow("1200", 690, 870)).toBeNull();
  });

  it("formats clock and closing times", () => {
    expect(formatClock(1470)).toBe("00:30");
    expect(formatClock(-420)).toBe("17:00");
    expect(formatClosing(1440)).toBe("24:00");
    expect(formatClosing(1530)).toBe("01:30");
  });
});
