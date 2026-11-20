import { invalidValue } from "./errors";

/**
 * A wall-clock time within one day, in the restaurant's time zone, as
 * minutes since midnight (0 = 00:00, 1439 = 23:59). Created only by
 * `timeOfDay()`.
 */
export type TimeOfDay = Readonly<{ minutes: number }>;

export const MINUTES_PER_DAY = 24 * 60;

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** From `HH:MM` (also `HH:MM:SS`, seconds are dropped) or minutes. */
export function timeOfDay(value: string | number): TimeOfDay {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value >= MINUTES_PER_DAY) {
      throw invalidValue("A time of day is 0 to 1439 minutes.", value);
    }
    return Object.freeze({ minutes: value });
  }
  const match = HH_MM.exec(value);
  if (!match) {
    throw invalidValue("A time of day is written HH:MM (00:00–23:59).", value);
  }
  return Object.freeze({
    minutes: Number(match[1]) * 60 + Number(match[2]),
  });
}

/** The local wall-clock time of a date (seconds dropped). */
export function timeOfDayFromDate(date: Date): TimeOfDay {
  return timeOfDay(date.getHours() * 60 + date.getMinutes());
}

/** `HH:MM`. */
export function formatTimeOfDay(time: TimeOfDay): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(time.minutes / 60))}:${pad(time.minutes % 60)}`;
}

export function compareTimeOfDay(a: TimeOfDay, b: TimeOfDay): number {
  return a.minutes - b.minutes;
}
