import { describe, expect, it } from "vitest";
import {
  formatTodayHours,
  groupOpeningHours,
  toTelHref,
} from "../../app/utils/openingHours";

const lunch = (dayOfWeek: number) => ({
  dayOfWeek,
  openingTime: "11:30:00",
  closingTime: "14:30:00",
});
const dinner = (dayOfWeek: number) => ({
  dayOfWeek,
  openingTime: "17:30",
  closingTime: "23:00",
});

describe("groupOpeningHours", () => {
  it("groups consecutive days with identical intervals", () => {
    // Pizzeria La Fattoria: closed on Tuesday, Saturday dinner only
    const businessHours = [1, 3, 4, 5, 7].flatMap((day) => [
      dinner(day),
      lunch(day),
    ]);
    businessHours.push(dinner(6));

    expect(groupOpeningHours(businessHours)).toEqual([
      { days: "Mo", intervals: ["11:30–14:30", "17:30–23:00"] },
      { days: "Di", intervals: [] },
      { days: "Mi–Fr", intervals: ["11:30–14:30", "17:30–23:00"] },
      { days: "Sa", intervals: ["17:30–23:00"] },
      { days: "So", intervals: ["11:30–14:30", "17:30–23:00"] },
    ]);
  });

  it("groups the whole week into one row", () => {
    expect(
      groupOpeningHours([1, 2, 3, 4, 5, 6, 7].map((day) => dinner(day))),
    ).toEqual([{ days: "Mo–So", intervals: ["17:30–23:00"] }]);
  });

  it("groups trailing closed days", () => {
    expect(groupOpeningHours([1, 2, 3, 4, 5].map(lunch))).toEqual([
      { days: "Mo–Fr", intervals: ["11:30–14:30"] },
      { days: "Sa–So", intervals: [] },
    ]);
  });

  it("returns no rows without usable opening hours", () => {
    expect(groupOpeningHours([])).toEqual([]);
    expect(groupOpeningHours([{ dayOfWeek: 1, openingTime: "11:30" }])).toEqual(
      [],
    );
  });
});

describe("toTelHref", () => {
  it("strips formatting from the phone number", () => {
    expect(toTelHref("+49 6104 71427")).toBe("tel:+49610471427");
    expect(toTelHref("06104 / 71-427")).toBe("tel:0610471427");
  });
});

describe("formatTodayHours", () => {
  const hours = [
    { dayOfWeek: 1, openingTime: "17:30:00", closingTime: "23:00:00" },
    { dayOfWeek: 1, openingTime: "11:30:00", closingTime: "14:30:00" },
    { dayOfWeek: 7, openingTime: "11:30:00", closingTime: "23:00:00" },
  ];

  it("joins the intervals of the weekday in order", () => {
    // 2026-09-14 is a Monday
    expect(formatTodayHours(hours, new Date(2026, 8, 14, 10))).toBe(
      "Heute 11:30–14:30 und 17:30–23:00",
    );
  });

  it("maps Sunday to day 7", () => {
    expect(formatTodayHours(hours, new Date(2026, 8, 13, 10))).toBe(
      "Heute 11:30–23:00",
    );
  });

  it("names a closed day", () => {
    expect(formatTodayHours(hours, new Date(2026, 8, 15, 10))).toBe(
      "Heute Ruhetag",
    );
  });
});
