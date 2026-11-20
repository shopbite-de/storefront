import {
  formatTimeOfDay,
  invalidValue,
  MINUTES_PER_DAY,
  timeOfDay,
  type TimeOfDay,
  type Weekday,
} from "../kernel";

/**
 * When an opening interval closes: minutes since midnight, 1 to 1440,
 * where 1440 (`24:00`) is the end of the day.
 */
export type ClosingTime = Readonly<{ minutes: number }>;

export function closingTime(value: string | number): ClosingTime {
  if (value === "24:00" || value === "24:00:00" || value === MINUTES_PER_DAY) {
    return Object.freeze({ minutes: MINUTES_PER_DAY });
  }
  return timeOfDay(value);
}

/**
 * A span of one day in which the restaurant is open and takes orders, e.g.
 * 11:30–14:30, or 18:00–24:00 up to the end of the day. It does not cross
 * midnight: a late-night opening is two intervals (18:00–24:00 and
 * 00:00–02:00 of the next weekday).
 */
export type OpeningInterval = Readonly<{
  opens: TimeOfDay;
  closes: ClosingTime;
}>;

export function openingInterval(
  opens: string | TimeOfDay,
  closes: string | ClosingTime,
): OpeningInterval {
  const from = typeof opens === "string" ? timeOfDay(opens) : opens;
  const to = typeof closes === "string" ? closingTime(closes) : closes;
  if (from.minutes >= to.minutes || to.minutes > MINUTES_PER_DAY) {
    throw invalidValue(
      "An opening interval opens before it closes, by 24:00 at the latest.",
      `${formatTimeOfDay(from)}–${formatTimeOfDay(to)}`,
    );
  }
  return Object.freeze({ opens: from, closes: to });
}

/** Whether the time lies in the interval, both ends included. */
export function intervalContains(
  interval: OpeningInterval,
  time: TimeOfDay,
): boolean {
  return (
    time.minutes >= interval.opens.minutes &&
    time.minutes <= interval.closes.minutes
  );
}

export type WeeklyOpeningInterval = Readonly<{
  weekday: Weekday;
  interval: OpeningInterval;
}>;

/**
 * The weekly opening hours ("Öffnungszeiten"). A weekday without intervals
 * is a weekly closing day ("Ruhetag").
 */
export type OpeningHours = Readonly<{
  intervals: readonly WeeklyOpeningInterval[];
}>;

/** Opening hours in weekday and opening time order, frozen. */
export function sortOpeningHours(
  intervals: readonly WeeklyOpeningInterval[],
): OpeningHours {
  return Object.freeze({
    intervals: Object.freeze(
      [...intervals].sort(
        (a, b) =>
          a.weekday - b.weekday ||
          a.interval.opens.minutes - b.interval.opens.minutes,
      ),
    ),
  });
}

/** The intervals of one weekday, in time order. */
export function intervalsOn(
  hours: OpeningHours,
  weekday: Weekday,
): OpeningInterval[] {
  return hours.intervals
    .filter((entry) => entry.weekday === weekday)
    .map((entry) => entry.interval)
    .sort((a, b) => a.opens.minutes - b.opens.minutes);
}
