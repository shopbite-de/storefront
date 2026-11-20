import { describe, expect, it } from "vitest";
import {
  earliestWishedTime,
  formatTimeOfDay,
  isDomainError,
  isOnWishedTimeGrid,
  leadTime,
  openingInterval,
  intervalContains,
  timeOfDay,
  timeOfDayFromDate,
  wishedTime,
  wishedTimeAtOrAfter,
  WISHED_TIME_STEP_MINUTES,
} from "../../../shared/domain";

function expectInvalid(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(isDomainError(error, "invalid_value")).toBe(true);
    return;
  }
  expect.unreachable("expected an invalid_value DomainError");
}

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

  it("takes the local wall-clock time of a date", () => {
    expect(timeOfDayFromDate(new Date(2026, 10, 20, 16, 43, 59)).minutes).toBe(
      16 * 60 + 43,
    );
  });
});

describe("WishedTime", () => {
  it("lies on the 5-minute grid", () => {
    expect(WISHED_TIME_STEP_MINUTES).toBe(5);
    expect(formatTimeOfDay(wishedTime("18:40"))).toBe("18:40");
    expectInvalid(() => wishedTime("18:43"));
    expect(isOnWishedTimeGrid(timeOfDay("18:45"))).toBe(true);
    expect(isOnWishedTimeGrid(timeOfDay("18:46"))).toBe(false);
  });

  it("rounds a time up to the next slot", () => {
    expect(formatTimeOfDay(wishedTimeAtOrAfter(timeOfDay("16:43"))!)).toBe(
      "16:45",
    );
    expect(formatTimeOfDay(wishedTimeAtOrAfter(timeOfDay("16:45"))!)).toBe(
      "16:45",
    );
  });

  it("has no slot after 23:55 on the same day", () => {
    expect(wishedTimeAtOrAfter(timeOfDay("23:56"))).toBeNull();
  });
});

describe("LeadTime", () => {
  it("is a whole number of minutes", () => {
    expect(leadTime(30).minutes).toBe(30);
    expect(leadTime(0).minutes).toBe(0);
    expectInvalid(() => leadTime(-5));
    expectInvalid(() => leadTime(12.5));
    expectInvalid(() => leadTime(Number.NaN));
  });

  it("is less than a day", () => {
    expect(leadTime(1439).minutes).toBe(1439);
    expectInvalid(() => leadTime(1440));
  });

  it("gives the earliest wished time: now plus lead time, on the grid", () => {
    const now = new Date(2026, 10, 20, 16, 13, 30);
    expect(formatTimeOfDay(earliestWishedTime(now, leadTime(30))!)).toBe(
      "16:45",
    );
    expect(formatTimeOfDay(earliestWishedTime(now, leadTime(15))!)).toBe(
      "16:30",
    );
  });

  it("gives no wished time when the lead time ends after today", () => {
    const now = new Date(2026, 10, 20, 23, 40);
    expect(earliestWishedTime(now, leadTime(30))).toBeNull();
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

  it("does not cross midnight (a late-night opening is two intervals)", () => {
    expectInvalid(() => openingInterval("18:00", "02:00"));
    expect(() => openingInterval("18:00", "23:59")).not.toThrow();
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
});
