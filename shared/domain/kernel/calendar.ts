import { invalidValue } from "./errors";
import { timeOfDay, type TimeOfDay } from "./timeOfDay";

/** IANA time zone of the restaurant, e.g. `Europe/Berlin`. */
export type TimeZone = string;

/** A day in the restaurant's time zone, written `YYYY-MM-DD`. */
export type CalendarDate = string;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const formatters = new Map<TimeZone, Intl.DateTimeFormat>();

function formatter(zone: TimeZone): Intl.DateTimeFormat {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(zone, format);
  }
  return format;
}

export function timeZone(name: string): TimeZone {
  try {
    if (!name) throw new RangeError("empty");
    formatter(name);
    return name;
  } catch {
    throw invalidValue("A time zone is an IANA name (Europe/Berlin).", name);
  }
}

const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

function utcDay(date: CalendarDate): Date {
  const [, year, month, day] = YYYY_MM_DD.exec(date)!;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function calendarDate(value: string): CalendarDate {
  const valid =
    YYYY_MM_DD.test(value) &&
    utcDay(value).toISOString().slice(0, 10) === value;
  if (!valid) {
    throw invalidValue("A date is written YYYY-MM-DD.", value);
  }
  return value;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const day = utcDay(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function weekdayOf(date: CalendarDate): Weekday {
  return (((utcDay(date).getUTCDay() + 6) % 7) + 1) as Weekday;
}

/** Date and wall-clock time of an instant in a time zone. */
export function zonedDateTime(
  instant: Date,
  zone: TimeZone,
): Readonly<{ date: CalendarDate; time: TimeOfDay }> {
  const parts = Object.fromEntries(
    formatter(zone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return Object.freeze({
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: timeOfDay(Number(parts.hour) * 60 + Number(parts.minute)),
  });
}

/** The wall-clock time of an instant in a time zone (seconds dropped). */
export function timeOfDayFromDate(instant: Date, zone: TimeZone): TimeOfDay {
  return zonedDateTime(instant, zone).time;
}
