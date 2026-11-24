import type { OpeningHours, Weekday } from "../../shared/domain";
import {
  formatClock,
  formatClosing,
  restaurantNow,
  serviceSpans,
} from "./restaurantTime";

/** A run of consecutive weekdays with identical opening hours. */
export type OpeningHoursRow = {
  /** e.g. `Mo` or `Mi–Fr` (the locale's day labels) */
  days: string;
  /** e.g. `["11:30–14:30", "17:30–23:00"]`; empty on closed days */
  intervals: string[];
};

/**
 * The words of the opening hours in the shop's locale (ADR 0002), from the
 * messages `common.hours.*`; the server's llms.txt passes its own.
 */
export interface OpeningHoursWords {
  /** Short labels of Monday … Sunday, e.g. `Mo` … `So`. */
  days: readonly string[];
  /** Today's intervals as a sentence, e.g. `Heute 11:30–14:30`. */
  today: (intervals: string) => string;
  /** A closed day, e.g. `Heute Ruhetag`. */
  closedToday: string;
  /** The word between two intervals, e.g. `und`. */
  and: string;
}

/**
 * Intervals of one weekday (1 = Monday … 7 = Sunday), e.g.
 * `["11:30–14:30"]`; a late-night opening reads `17:00–01:30` on the day it
 * starts.
 */
export function intervalsForDay(
  hours: OpeningHours,
  weekday: Weekday,
): string[] {
  return serviceSpans(hours, weekday).map(
    (span) => `${formatClock(span.opens)}–${formatClosing(span.closes)}`,
  );
}

/**
 * Today's hours in the restaurant's time zone as a sentence for the
 * information cards (#332): `Heute 11:30–14:30 und 17:30–23:00`, or
 * `Heute Ruhetag` on a closed day.
 */
export function formatTodayHours(
  hours: OpeningHours,
  instant: Date,
  timeZone: string,
  words: Pick<OpeningHoursWords, "today" | "closedToday" | "and">,
): string {
  const intervals = intervalsForDay(
    hours,
    restaurantNow(instant, timeZone).weekday,
  );
  return intervals.length === 0
    ? words.closedToday
    : words.today(intervals.join(` ${words.and} `));
}

/**
 * Groups the opening hours into display rows: consecutive days (Monday to
 * Sunday) with the same intervals share a row. Returns an empty list if no
 * day has opening hours.
 */
export function groupOpeningHours(
  hours: OpeningHours,
  words: Pick<OpeningHoursWords, "days">,
): OpeningHoursRow[] {
  const DAY_LABELS = words.days;
  const intervalsByDay = DAY_LABELS.map((_, index) =>
    intervalsForDay(hours, (index + 1) as Weekday),
  );

  if (intervalsByDay.every((intervals) => intervals.length === 0)) return [];

  const rows: OpeningHoursRow[] = [];
  let firstDay = 0;

  for (let day = 1; day <= DAY_LABELS.length; day++) {
    const sameAsGroup =
      day < DAY_LABELS.length &&
      intervalsByDay[day]!.join() === intervalsByDay[firstDay]!.join();
    if (sameAsGroup) continue;

    const lastDay = day - 1;
    rows.push({
      days:
        firstDay === lastDay
          ? DAY_LABELS[firstDay]!
          : `${DAY_LABELS[firstDay]}–${DAY_LABELS[lastDay]}`,
      intervals: intervalsByDay[firstDay]!,
    });
    firstDay = day;
  }

  return rows;
}

/** `tel:` link for a displayed phone number, e.g. `+49 123 456789`. */
export function toTelHref(telephone: string): string {
  return `tel:${telephone.replace(/[^\d+]/g, "")}`;
}
