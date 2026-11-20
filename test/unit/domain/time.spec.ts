import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDate,
  earliestWishedTime,
  formatTimeOfDay,
  holiday,
  intervalContains,
  isDomainError,
  isHoliday,
  isOnWishedTimeGrid,
  leadTime,
  openingInterval,
  sortOpeningHours,
  timeOfDay,
  timeOfDayFromDate,
  timeZone,
  weekdayOf,
  wishedTime,
  WISHED_TIME_STEP_MINUTES,
  zonedDateTime,
  type Holiday,
  type OpeningHours,
  type Weekday,
} from "../../../shared/domain";

const BERLIN = "Europe/Berlin";

function expectInvalid(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(isDomainError(error, "invalid_value")).toBe(true);
    return;
  }
  expect.unreachable("expected an invalid_value DomainError");
}

function hours(
  rows: Partial<Record<Weekday, [string, string][]>>,
): OpeningHours {
  return sortOpeningHours(
    Object.entries(rows).flatMap(([weekday, intervals]) =>
      (intervals ?? []).map(([opens, closes]) => ({
        weekday: Number(weekday) as Weekday,
        interval: openingInterval(opens, closes),
      })),
    ),
  );
}

const written = (time: { date: string; time: { minutes: number } } | null) =>
  time && `${time.date} ${formatTimeOfDay(time.time)}`;

describe("TimeOfDay", () => {
  it("parses HH:MM and the HH:MM:SS of backends", () => {
    expect(timeOfDay("18:40").minutes).toBe(18 * 60 + 40);
    expect(timeOfDay("11:30:00").minutes).toBe(11 * 60 + 30);
    expect(timeOfDay("00:00").minutes).toBe(0);
    expect(timeOfDay("23:59").minutes).toBe(23 * 60 + 59);
  });

  it("accepts minutes since midnight", () => {
    expect(formatTimeOfDay(timeOfDay(605))).toBe("10:05");
  });

  it("rejects what is not a time of one day", () => {
    for (const value of ["24:00", "7:5", "12:60", "", "abc", -1, 1440, 1.5]) {
      expectInvalid(() => timeOfDay(value));
    }
  });

  it("is immutable", () => {
    expect(Object.isFrozen(timeOfDay("12:00"))).toBe(true);
  });
});

describe("restaurant time zone", () => {
  const at = (iso: string) =>
    formatTimeOfDay(timeOfDayFromDate(new Date(iso), BERLIN));

  it("accepts IANA time zones only", () => {
    expect(timeZone("Europe/Berlin")).toBe("Europe/Berlin");
    expectInvalid(() => timeZone("Mars/Olympus"));
    expectInvalid(() => timeZone(""));
  });

  it("reads the wall-clock time of an instant in the restaurant's zone", () => {
    expect(at("2026-11-20T15:43:59Z")).toBe("16:43");
    expect(at("2026-07-20T15:43:00Z")).toBe("17:43");
  });

  it("gives the restaurant's date, not the server's", () => {
    expect(zonedDateTime(new Date("2026-11-20T23:30:00Z"), BERLIN)).toEqual({
      date: "2026-11-21",
      time: timeOfDay("00:30"),
    });
  });

  it("follows the switch to summer time", () => {
    // 2026-03-29: 02:00 CET becomes 03:00 CEST at 01:00 UTC
    expect(at("2026-03-29T00:59:00Z")).toBe("01:59");
    expect(at("2026-03-29T01:00:00Z")).toBe("03:00");
  });

  it("follows the switch back to winter time", () => {
    // 2026-10-25: 03:00 CEST becomes 02:00 CET at 01:00 UTC
    expect(at("2026-10-25T00:30:00Z")).toBe("02:30");
    expect(at("2026-10-25T01:30:00Z")).toBe("02:30");
  });
});

describe("CalendarDate", () => {
  it("is a real date written YYYY-MM-DD", () => {
    expect(calendarDate("2026-02-28")).toBe("2026-02-28");
    for (const value of ["2026-02-30", "2026-13-01", "20.11.2026", ""]) {
      expectInvalid(() => calendarDate(value));
    }
  });

  it("adds days across months and years", () => {
    expect(addDays(calendarDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(calendarDate("2026-03-01"), -1)).toBe("2026-02-28");
  });

  it("knows its ISO weekday", () => {
    expect(weekdayOf(calendarDate("2026-11-20"))).toBe(5);
    expect(weekdayOf(calendarDate("2026-03-29"))).toBe(7);
    expect(weekdayOf(calendarDate("2026-07-20"))).toBe(1);
  });
});

describe("OpeningInterval", () => {
  it("opens before it closes", () => {
    const lunch = openingInterval("11:30", "14:30");
    expect(formatTimeOfDay(lunch.opens)).toBe("11:30");
    expect(formatTimeOfDay(lunch.closes)).toBe("14:30");
    expectInvalid(() => openingInterval("14:30", "11:30"));
    expectInvalid(() => openingInterval("12:00", "12:00"));
  });

  it("may close at the end of the day (24:00)", () => {
    const evening = openingInterval("18:00", "24:00");
    expect(evening.closes.minutes).toBe(1440);
    expect(formatTimeOfDay(evening.closes)).toBe("24:00");
    expectInvalid(() => openingInterval("24:00", "24:00"));
    expectInvalid(() => openingInterval("18:00", "24:01"));
  });

  it("does not cross midnight (a late-night opening is two intervals)", () => {
    expectInvalid(() => openingInterval("18:00", "02:00"));
    expect(() => openingInterval("00:00", "02:00")).not.toThrow();
  });

  it("contains its opening and closing time", () => {
    const evening = openingInterval("17:30", "23:00");
    expect(intervalContains(evening, timeOfDay("17:30"))).toBe(true);
    expect(intervalContains(evening, timeOfDay("23:00"))).toBe(true);
    expect(intervalContains(evening, timeOfDay("17:29"))).toBe(false);
    expect(intervalContains(evening, timeOfDay("23:01"))).toBe(false);
  });

  it("is immutable", () => {
    expect(Object.isFrozen(openingInterval("11:00", "14:00"))).toBe(true);
  });

  it("sorts opening hours by weekday and opening time", () => {
    const sorted = hours({
      3: [["17:30", "23:00"]],
      2: [
        ["17:30", "23:00"],
        ["11:30", "14:30"],
      ],
    });
    expect(
      sorted.intervals.map(
        ({ weekday, interval }) =>
          `${weekday} ${formatTimeOfDay(interval.opens)}`,
      ),
    ).toEqual(["2 11:30", "2 17:30", "3 17:30"]);
    expect(Object.isFrozen(sorted.intervals)).toBe(true);
  });
});

describe("Holiday", () => {
  const summer = holiday({
    id: "summer",
    firstDay: "2026-07-20",
    lastDay: "2026-08-02",
  });

  it("is whole days, both included", () => {
    expect(isHoliday([summer], calendarDate("2026-07-19"))).toBe(false);
    expect(isHoliday([summer], calendarDate("2026-07-20"))).toBe(true);
    expect(isHoliday([summer], calendarDate("2026-08-02"))).toBe(true);
    expect(isHoliday([summer], calendarDate("2026-08-03"))).toBe(false);
  });

  it("does not end before it starts", () => {
    expect(() =>
      holiday({ id: "x", firstDay: "2026-12-24", lastDay: "2026-12-24" }),
    ).not.toThrow();
    expectInvalid(() =>
      holiday({ id: "x", firstDay: "2026-12-26", lastDay: "2026-12-24" }),
    );
    expectInvalid(() =>
      holiday({ id: "x", firstDay: "2026-12-24", lastDay: "24.12.2026" }),
    );
  });
});

describe("WishedTime", () => {
  it("is a time on the 5-minute grid of a service date", () => {
    expect(WISHED_TIME_STEP_MINUTES).toBe(5);
    expect(written(wishedTime("2026-11-20", "18:40"))).toBe("2026-11-20 18:40");
    expectInvalid(() => wishedTime("2026-11-20", "18:43"));
    expectInvalid(() => wishedTime("2026-11-31", "18:40"));
    expect(isOnWishedTimeGrid(timeOfDay("18:45"))).toBe(true);
    expect(isOnWishedTimeGrid(timeOfDay("18:46"))).toBe(false);
  });

  it("revalidates a time of day it is given", () => {
    expectInvalid(() => wishedTime("2026-11-20", { minutes: 1440 }));
    expectInvalid(() => wishedTime("2026-11-20", { minutes: -5 }));
  });

  it("is immutable", () => {
    expect(Object.isFrozen(wishedTime("2026-11-20", "18:40"))).toBe(true);
  });
});

describe("LeadTime", () => {
  it("is a whole number of minutes, less than a day", () => {
    expect(leadTime(30).minutes).toBe(30);
    expect(leadTime(0).minutes).toBe(0);
    expect(leadTime(1439).minutes).toBe(1439);
    for (const value of [-5, 12.5, Number.NaN, 1440]) {
      expectInvalid(() => leadTime(value));
    }
  });
});

describe("earliestWishedTime", () => {
  const allDay = hours(
    Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((day) => [day, [["00:00", "24:00"]]]),
    ),
  );
  const schedule = (openingHours: OpeningHours, holidays: Holiday[] = []) => ({
    timeZone: BERLIN,
    openingHours,
    holidays,
  });
  // 2026-11-20 is a Friday; Berlin is UTC+1 in November
  const friday = (time: string) => new Date(`2026-11-20T${time}+01:00`);
  const earliest = (
    now: Date,
    minutes: number,
    openingHours: OpeningHours,
    holidays: Holiday[] = [],
  ) =>
    written(
      earliestWishedTime(
        now,
        leadTime(minutes),
        schedule(openingHours, holidays),
      ),
    );

  it("is now plus the lead time, rounded up to the grid", () => {
    expect(earliest(friday("16:13:30"), 30, allDay)).toBe("2026-11-20 16:45");
    expect(earliest(friday("16:13:30"), 15, allDay)).toBe("2026-11-20 16:30");
  });

  it("waits for the opening", () => {
    const evening = hours({ 5: [["17:30", "23:00"]] });
    expect(earliest(friday("16:13"), 30, evening)).toBe("2026-11-20 17:30");
  });

  it("skips an interval that ends before the lead time is over", () => {
    const split = hours({
      5: [
        ["11:30", "14:30"],
        ["17:30", "23:00"],
      ],
    });
    expect(earliest(friday("14:10"), 30, split)).toBe("2026-11-20 17:30");
  });

  it("crosses midnight into the next day's early interval", () => {
    const lateNight = hours({
      5: [["17:30", "24:00"]],
      6: [["00:00", "01:30"]],
    });
    expect(earliest(friday("23:50"), 30, lateNight)).toBe("2026-11-21 00:20");
    expect(earliest(friday("23:00"), 30, lateNight)).toBe("2026-11-20 23:30");
  });

  it("looks at most 24 hours ahead", () => {
    const saturdayLunch = hours({ 6: [["11:30", "14:30"]] });
    expect(earliest(friday("22:00"), 30, saturdayLunch)).toBe(
      "2026-11-21 11:30",
    );
    expect(earliest(friday("10:00"), 30, saturdayLunch)).toBeNull();
  });

  it("gives nothing after the last interval of the day", () => {
    const evening = hours({ 5: [["18:00", "24:00"]] });
    expect(earliest(friday("23:20"), 30, evening)).toBe("2026-11-20 23:50");
    expect(earliest(friday("23:35"), 30, evening)).toBeNull();
  });

  it("skips holidays", () => {
    const today = holiday({
      id: "h",
      firstDay: "2026-11-20",
      lastDay: "2026-11-20",
    });
    const both = holiday({
      id: "h",
      firstDay: "2026-11-20",
      lastDay: "2026-11-21",
    });
    expect(earliest(friday("22:00"), 30, allDay, [today])).toBe(
      "2026-11-21 00:00",
    );
    expect(earliest(friday("22:00"), 30, allDay, [both])).toBeNull();
  });

  it("counts the lead time in real minutes across the switch to summer time", () => {
    // 01:50 CET + 30 minutes = 03:20 CEST
    expect(earliest(new Date("2026-03-29T00:50:00Z"), 30, allDay)).toBe(
      "2026-03-29 03:20",
    );
  });
});
