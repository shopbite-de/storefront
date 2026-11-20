import {
  formatTimeOfDay,
  invalidValue,
  timeOfDay,
  type TimeOfDay,
} from "../kernel";

/**
 * A span of one day in which the restaurant is open and takes orders, e.g.
 * 11:30–14:30. It does not cross midnight: a late-night opening is two
 * intervals (18:00–23:59 and 00:00–02:00 of the next weekday).
 */
export type OpeningInterval = Readonly<{
  opens: TimeOfDay;
  closes: TimeOfDay;
}>;

export function openingInterval(
  opens: string | TimeOfDay,
  closes: string | TimeOfDay,
): OpeningInterval {
  const from = typeof opens === "string" ? timeOfDay(opens) : opens;
  const to = typeof closes === "string" ? timeOfDay(closes) : closes;
  if (from.minutes >= to.minutes) {
    throw invalidValue(
      "An opening interval opens before it closes (and ends by 23:59).",
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
