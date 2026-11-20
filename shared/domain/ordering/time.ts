import {
  addDays,
  calendarDate,
  invalidValue,
  MINUTES_PER_DAY,
  timeOfDay,
  weekdayOf,
  zonedDateTime,
  type CalendarDate,
  type TimeOfDay,
  type TimeZone,
} from "../kernel";
import {
  intervalsOn,
  isHoliday,
  type Holiday,
  type OpeningHours,
} from "../restaurant";

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
 * When the guest wants the order delivered or picked up
 * ("Wunschlieferzeit"/"Wunschabholzeit"): a service date and a time on the
 * 5-minute grid, in the restaurant's time zone. The date lets an order
 * placed before midnight be wished for shortly after it.
 */
export type WishedTime = Readonly<{ date: CalendarDate; time: TimeOfDay }>;

export function isOnWishedTimeGrid(time: TimeOfDay): boolean {
  return time.minutes % WISHED_TIME_STEP_MINUTES === 0;
}

export function wishedTime(
  date: string,
  time: string | number | Readonly<{ minutes: number }>,
): WishedTime {
  // a given TimeOfDay is checked again: it may come from JSON
  const checked = timeOfDay(typeof time === "object" ? time.minutes : time);
  if (!isOnWishedTimeGrid(checked)) {
    throw invalidValue(
      `A wished time is on the ${WISHED_TIME_STEP_MINUTES}-minute grid.`,
      checked.minutes,
    );
  }
  return Object.freeze({ date: calendarDate(date), time: checked });
}

/** What decides when the restaurant can serve an order. */
export type ServiceSchedule = Readonly<{
  timeZone: TimeZone;
  openingHours: OpeningHours;
  holidays: readonly Holiday[];
}>;

/**
 * The earliest wished time from now: now plus the lead time (real
 * minutes), rounded up to the grid, within an opening interval of today or
 * tomorrow that is not a holiday, and less than 24 hours ahead; null if
 * there is none.
 */
export function earliestWishedTime(
  now: Date,
  lead: LeadTime,
  schedule: ServiceSchedule,
): WishedTime | null {
  const { timeZone, openingHours, holidays } = schedule;
  const current = zonedDateTime(now, timeZone);
  const today = current.date;
  const ready = zonedDateTime(
    new Date(now.getTime() + lead.minutes * 60_000),
    timeZone,
  );
  // minutes since today's midnight; a time tomorrow counts on from 1440
  const dayOffset = ready.date === today ? 0 : 1;
  if (ready.date !== today && ready.date !== addDays(today, 1)) return null;
  const earliest = dayOffset * MINUTES_PER_DAY + ready.time.minutes;
  const limit = current.time.minutes + MINUTES_PER_DAY;
  const step = WISHED_TIME_STEP_MINUTES;

  for (const offset of [0, 1]) {
    const date = addDays(today, offset);
    if (isHoliday(holidays, date)) continue;
    const base = offset * MINUTES_PER_DAY;
    for (const interval of intervalsOn(openingHours, weekdayOf(date))) {
      const start = base + interval.opens.minutes;
      const end = base + interval.closes.minutes;
      const candidate = Math.ceil(Math.max(earliest, start) / step) * step;
      if (candidate > end || candidate >= limit) continue;
      const serviceDate = addDays(
        today,
        Math.floor(candidate / MINUTES_PER_DAY),
      );
      // 24:00 is 00:00 of the next day, which may be a holiday
      if (serviceDate !== date && isHoliday(holidays, serviceDate)) continue;
      return wishedTime(serviceDate, candidate % MINUTES_PER_DAY);
    }
  }
  return null;
}
