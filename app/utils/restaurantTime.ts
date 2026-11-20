/**
 * The restaurant's clock (ADR 0001): store status and wished times are
 * computed in the restaurant's time zone from the domain's opening hours
 * and holidays, never from the visitor's or the server's clock. Pure and
 * free of Nuxt imports, so the server (llms.txt) can use it too.
 *
 * App code imports only types from shared/domain (a value import broke the
 * server bundle of shops in 2.0.1), so the few calendar helpers needed here
 * are app-local.
 */
import type {
  CalendarDate,
  Holiday,
  OpeningHours,
  ServiceSchedule,
  Weekday,
} from "../../shared/domain";

export const MINUTES_PER_DAY = 1440;

/** Minutes between two wished times. */
export const WISHED_TIME_STEP = 5;

/** Assumed when a shipping method has no lead time. */
export const DEFAULT_LEAD_MINUTES = 30;

export type RestaurantNow = Readonly<{
  date: CalendarDate;
  weekday: Weekday;
  /** Minutes since the restaurant's midnight, seconds dropped. */
  minutes: number;
}>;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

const utcDay = (date: CalendarDate) => new Date(`${date}T00:00:00Z`);

export function weekdayOfDate(date: CalendarDate): Weekday {
  return (((utcDay(date).getUTCDay() + 6) % 7) + 1) as Weekday;
}

export function shiftDate(date: CalendarDate, days: number): CalendarDate {
  const day = utcDay(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** Date, weekday and wall-clock minutes of an instant in a time zone. */
export function restaurantNow(instant: Date, timeZone: string): RestaurantNow {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    weekday: weekdayOfDate(date),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isHolidayOn(
  holidays: readonly Holiday[],
  date: CalendarDate,
): boolean {
  return holidays.some(
    (entry) => entry.firstDay <= date && date <= entry.lastDay,
  );
}

/** `HH:MM` of minutes since a midnight; past midnight it starts over. */
export function formatClock(minutes: number): string {
  const day = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(day / 60))}:${pad(day % 60)}`;
}

/** A closing time: the end of the day (1440) is `24:00`. */
export function formatClosing(minutes: number): string {
  return minutes === MINUTES_PER_DAY ? "24:00" : formatClock(minutes);
}

/**
 * A stretch of service as the restaurant entered it: minutes since the
 * midnight of its weekday; a late-night opening ends after 1440.
 */
export type ServiceSpan = Readonly<{ opens: number; closes: number }>;

const nextWeekday = (weekday: Weekday) => ((weekday % 7) + 1) as Weekday;
const previousWeekday = (weekday: Weekday) =>
  (((weekday + 5) % 7) + 1) as Weekday;

function intervalsOf(hours: OpeningHours, weekday: Weekday): ServiceSpan[] {
  return hours.intervals
    .filter((entry) => entry.weekday === weekday)
    .map(({ interval }) => ({
      opens: interval.opens.minutes,
      closes: interval.closes.minutes,
    }))
    .sort((a, b) => a.opens - b.opens);
}

/** A late evening up to 24:00 that the next weekday continues from 00:00. */
function continuation(
  span: ServiceSpan,
  next: readonly ServiceSpan[],
): ServiceSpan | undefined {
  if (span.closes !== MINUTES_PER_DAY || span.opens === 0) return undefined;
  return next.find(
    (after) => after.opens === 0 && after.closes < MINUTES_PER_DAY,
  );
}

/**
 * The spans of a weekday with a late-night opening joined again: the
 * domain splits it at midnight (Fri 17:00–24:00, Sat 00:00–01:30), the
 * guest reads it as Fri 17:00–01:30. The continuation is left out of the
 * next weekday's spans.
 */
export function serviceSpans(
  hours: OpeningHours,
  weekday: Weekday,
): ServiceSpan[] {
  const own = intervalsOf(hours, weekday);
  const next = intervalsOf(hours, nextWeekday(weekday));
  const carriedOver = intervalsOf(hours, previousWeekday(weekday))
    .map((span) => continuation(span, own))
    .find((span) => span !== undefined);
  return own
    .filter((span) => span !== carriedOver)
    .map((span) => {
      const after = continuation(span, next);
      return after
        ? { opens: span.opens, closes: MINUTES_PER_DAY + after.closes }
        : span;
    });
}

/**
 * What the restaurant serves on a date, in minutes since that date's
 * midnight: the day's own spans and the part of yesterday's late-night
 * span after midnight. Like the ShopBite plugin's ordering window: nothing
 * on a holiday, and yesterday's span only when yesterday was no holiday.
 */
export function servicePeriodsOn(
  schedule: ServiceSchedule,
  date: CalendarDate,
): ServiceSpan[] {
  const { openingHours, holidays } = schedule;
  if (isHolidayOn(holidays, date)) return [];
  const yesterday = shiftDate(date, -1);
  const carried = isHolidayOn(holidays, yesterday)
    ? []
    : serviceSpans(openingHours, weekdayOfDate(yesterday))
        .filter((span) => span.closes > MINUTES_PER_DAY)
        .map((span) => ({
          opens: span.opens - MINUTES_PER_DAY,
          closes: span.closes - MINUTES_PER_DAY,
        }));
  return [...carried, ...serviceSpans(openingHours, weekdayOfDate(date))].sort(
    (a, b) => a.opens - b.opens,
  );
}

const DAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

export function weekdayName(weekday: Weekday): string {
  return DAY_NAMES[weekday - 1]!;
}

/** Whether the restaurant is open now, for the status pill. */
export type StoreStatus =
  | { open: true; closesAt: string }
  | { open: false; nextOpening: string | null };

/** How far ahead the next opening is looked for (long holidays). */
const NEXT_OPENING_DAYS = 60;

function nextOpening(
  schedule: ServiceSchedule,
  now: RestaurantNow,
): string | null {
  for (let offset = 0; offset < NEXT_OPENING_DAYS; offset++) {
    const date = shiftDate(now.date, offset);
    if (isHolidayOn(schedule.holidays, date)) continue;
    const spans = serviceSpans(schedule.openingHours, weekdayOfDate(date));
    const next =
      offset === 0 ? spans.find((span) => span.opens > now.minutes) : spans[0];
    if (!next) continue;
    const time = formatClock(next.opens);
    if (offset === 0) return `${time} Uhr`;
    if (offset === 1) return `morgen um ${time} Uhr`;
    const [, month, day] = date.split("-");
    return `${weekdayName(weekdayOfDate(date))}, ${day}.${month}. um ${time} Uhr`;
  }
  return null;
}

/**
 * Open (with the closing time of the current span) or closed (with the
 * next opening), in the restaurant's time zone.
 */
export function storeStatusAt(
  instant: Date,
  schedule: ServiceSchedule,
): StoreStatus {
  const now = restaurantNow(instant, schedule.timeZone);
  const current = servicePeriodsOn(schedule, now.date).find(
    (span) => span.opens <= now.minutes && now.minutes <= span.closes,
  );
  if (current) return { open: true, closesAt: formatClosing(current.closes) };
  return { open: false, nextOpening: nextOpening(schedule, now) };
}

/**
 * The wished times a guest can choose now, as the ShopBite plugin accepts
 * an order: today (yesterday's late-night span included), not on a
 * holiday, within the span in which the order can be ready (now plus the
 * lead time) or the next one today. Minutes since today's midnight; a span
 * running past midnight ends after 1440. Pre-orders for a later service
 * day are not offered (the plugin refuses them).
 */
export type WishedTimeWindow =
  | Readonly<{ kind: "holiday" }>
  /** No opening today at all (weekly closing day). */
  | Readonly<{ kind: "closing_day"; weekday: Weekday }>
  /** Today's spans end before an order could be ready. */
  | Readonly<{ kind: "none_left" }>
  | Readonly<{
      kind: "open";
      /** Now plus the lead time. */
      ready: number;
      /** The span the window lies in. */
      span: ServiceSpan;
      /** First and last minute the guest may choose. */
      earliest: number;
      latest: number;
    }>;

export function wishedTimeWindow(
  instant: Date,
  schedule: ServiceSchedule,
  leadMinutes: number | null,
): WishedTimeWindow {
  const now = restaurantNow(instant, schedule.timeZone);
  if (isHolidayOn(schedule.holidays, now.date)) return { kind: "holiday" };
  const periods = servicePeriodsOn(schedule, now.date);
  if (periods.length === 0) {
    return { kind: "closing_day", weekday: now.weekday };
  }
  const ready = now.minutes + (leadMinutes ?? DEFAULT_LEAD_MINUTES);
  const span =
    periods.find((period) => period.opens <= ready && ready <= period.closes) ??
    periods.find((period) => period.opens > ready);
  if (!span) return { kind: "none_left" };
  return {
    kind: "open",
    ready,
    span,
    earliest: Math.max(ready, span.opens),
    latest: span.closes,
  };
}

/**
 * The first slot on the 5-minute grid within [earliest, latest]: rounded
 * up, else the last slot before `latest`; `null` if the window has none.
 */
export function firstSlot(earliest: number, latest: number): number | null {
  const rounded = Math.ceil(earliest / WISHED_TIME_STEP) * WISHED_TIME_STEP;
  if (rounded <= latest) return rounded;
  const last = Math.floor(latest / WISHED_TIME_STEP) * WISHED_TIME_STEP;
  return last >= earliest ? last : null;
}

/**
 * A chosen `HH:MM` as minutes of the window's frame: in a window running
 * past midnight 00:30 is 1470. Outside the window it is the reading
 * nearest to it, so a message can say "too early" or "too late". `null`
 * for anything not `HH:MM`.
 */
export function minutesInWindow(
  time: string,
  earliest: number,
  latest: number,
): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (latest <= MINUTES_PER_DAY) return minutes;
  const distance = (candidate: number) =>
    candidate < earliest
      ? earliest - candidate
      : Math.max(0, candidate - latest);
  const later = minutes + MINUTES_PER_DAY;
  return distance(later) < distance(minutes) ? later : minutes;
}
