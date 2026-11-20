import { describe, expect, it } from "vitest";
import {
  formatTodayHours,
  groupOpeningHours,
  intervalsForDay,
  toTelHref,
} from "../../app/utils/openingHours";
import {
  openingInterval,
  sortOpeningHours,
  type Weekday,
} from "../../shared/domain";

type Row = [Weekday, string, string];
const hours = (rows: Row[]) =>
  sortOpeningHours(
    rows.map(([weekday, opens, closes]) => ({
      weekday,
      interval: openingInterval(opens, closes),
    })),
  );
const lunch = (day: Weekday): Row => [day, "11:30", "14:30"];
const dinner = (day: Weekday): Row => [day, "17:30", "23:00"];
const BERLIN = "Europe/Berlin";

describe("groupOpeningHours", () => {
  it("groups consecutive days with identical intervals", () => {
    // closed on Tuesday, Saturday dinner only
    const rows = ([1, 3, 4, 5, 7] as Weekday[]).flatMap((day) => [
      dinner(day),
      lunch(day),
    ]);
    rows.push(dinner(6));

    expect(groupOpeningHours(hours(rows))).toEqual([
      { days: "Mo", intervals: ["11:30–14:30", "17:30–23:00"] },
      { days: "Di", intervals: [] },
      { days: "Mi–Fr", intervals: ["11:30–14:30", "17:30–23:00"] },
      { days: "Sa", intervals: ["17:30–23:00"] },
      { days: "So", intervals: ["11:30–14:30", "17:30–23:00"] },
    ]);
  });

  it("groups the whole week into one row", () => {
    expect(
      groupOpeningHours(
        hours(([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map(dinner)),
      ),
    ).toEqual([{ days: "Mo–So", intervals: ["17:30–23:00"] }]);
  });

  it("groups trailing closed days", () => {
    expect(
      groupOpeningHours(hours(([1, 2, 3, 4, 5] as Weekday[]).map(lunch))),
    ).toEqual([
      { days: "Mo–Fr", intervals: ["11:30–14:30"] },
      { days: "Sa–So", intervals: [] },
    ]);
  });

  it("returns no rows without opening hours", () => {
    expect(groupOpeningHours(hours([]))).toEqual([]);
  });

  it("shows a late-night opening on the day it starts", () => {
    const late = hours([
      [5, "17:00", "24:00"],
      [6, "00:00", "01:30"],
      [6, "17:00", "23:00"],
      [7, "12:00", "24:00"],
    ]);
    expect(intervalsForDay(late, 5)).toEqual(["17:00–01:30"]);
    expect(intervalsForDay(late, 6)).toEqual(["17:00–23:00"]);
    expect(intervalsForDay(late, 7)).toEqual(["12:00–24:00"]);
  });
});

describe("toTelHref", () => {
  it("strips formatting from the phone number", () => {
    expect(toTelHref("+49 123 456789")).toBe("tel:+49123456789");
    expect(toTelHref("0123 / 456-789")).toBe("tel:0123456789");
  });
});

describe("formatTodayHours", () => {
  const week = hours([dinner(1), lunch(1), [7, "11:30", "23:00"]]);

  it("joins the intervals of the weekday in order", () => {
    // 2026-09-14 is a Monday
    expect(
      formatTodayHours(week, new Date("2026-09-14T10:00:00+02:00"), BERLIN),
    ).toBe("Heute 11:30–14:30 und 17:30–23:00");
  });

  it("maps Sunday to day 7", () => {
    expect(
      formatTodayHours(week, new Date("2026-09-13T10:00:00+02:00"), BERLIN),
    ).toBe("Heute 11:30–23:00");
  });

  it("names a closed day", () => {
    expect(
      formatTodayHours(week, new Date("2026-09-15T10:00:00+02:00"), BERLIN),
    ).toBe("Heute Ruhetag");
  });

  it("takes today in the restaurant's time zone", () => {
    // Monday 23:30 UTC is Tuesday in Berlin
    expect(
      formatTodayHours(week, new Date("2026-09-14T23:30:00Z"), BERLIN),
    ).toBe("Heute Ruhetag");
  });
});
