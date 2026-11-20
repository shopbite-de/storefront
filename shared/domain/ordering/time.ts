import {
  invalidValue,
  MINUTES_PER_DAY,
  timeOfDay,
  timeOfDayFromDate,
  type TimeOfDay,
} from "../kernel";

/** Minutes between two wished times the guest can choose. */
export const WISHED_TIME_STEP_MINUTES = 5;

/**
 * How long the kitchen needs before an order is delivered or ready for
 * pickup, in whole minutes; set per shipping method.
 */
export type LeadTime = Readonly<{ minutes: number }>;

export function leadTime(minutes: number): LeadTime {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_PER_DAY) {
    throw invalidValue("A lead time is 0 to 1439 whole minutes.", minutes);
  }
  return Object.freeze({ minutes });
}

/**
 * The time the guest wants the order delivered or picked up
 * ("Wunschlieferzeit"/"Wunschabholzeit"), today, on the 5-minute grid.
 */
export type WishedTime = TimeOfDay & Readonly<{ __wishedTime: true }>;

export function isOnWishedTimeGrid(time: TimeOfDay): boolean {
  return time.minutes % WISHED_TIME_STEP_MINUTES === 0;
}

export function wishedTime(value: string | number | TimeOfDay): WishedTime {
  const time = typeof value === "object" ? value : timeOfDay(value);
  if (!isOnWishedTimeGrid(time)) {
    throw invalidValue(
      `A wished time is on the ${WISHED_TIME_STEP_MINUTES}-minute grid.`,
      time.minutes,
    );
  }
  return time as WishedTime;
}

/** The first wished time at or after a time; null after the last slot. */
export function wishedTimeAtOrAfter(time: TimeOfDay): WishedTime | null {
  const step = WISHED_TIME_STEP_MINUTES;
  const minutes = Math.ceil(time.minutes / step) * step;
  return minutes < MINUTES_PER_DAY ? wishedTime(minutes) : null;
}

/**
 * The earliest wished time from now: the current time plus the lead time,
 * rounded up to the grid; null when that is past today. Opening hours and
 * holidays narrow it further (ordering window).
 */
export function earliestWishedTime(
  now: Date,
  lead: LeadTime,
): WishedTime | null {
  const minutes = timeOfDayFromDate(now).minutes + lead.minutes;
  return minutes < MINUTES_PER_DAY
    ? wishedTimeAtOrAfter(timeOfDay(minutes))
    : null;
}
