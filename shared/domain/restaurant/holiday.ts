import {
  calendarDate,
  invalidValue,
  type CalendarDate,
  type Id,
} from "../kernel";

/**
 * Whole days on which the restaurant stays closed although the weekly
 * hours say open ("Betriebsferien"), in its time zone, both included.
 */
export type Holiday = Readonly<{
  id: Id;
  firstDay: CalendarDate;
  lastDay: CalendarDate;
}>;

export function holiday(input: {
  id: Id;
  firstDay: string;
  lastDay: string;
}): Holiday {
  const firstDay = calendarDate(input.firstDay);
  const lastDay = calendarDate(input.lastDay);
  if (lastDay < firstDay) {
    throw invalidValue("A holiday does not end before it starts.", input);
  }
  return Object.freeze({ id: input.id, firstDay, lastDay });
}

export function isHoliday(
  holidays: readonly Holiday[],
  date: CalendarDate,
): boolean {
  return holidays.some(
    (entry) => entry.firstDay <= date && date <= entry.lastDay,
  );
}
