import { setTime } from "./time";
import { isClosedHoliday } from "~/utils/holidays";

export type ServiceInterval = { start: Date; end: Date };

export function isTuesday(date: Date): boolean {
  return date.getDay() === 2;
}

export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

export function getServiceIntervals(date: Date): Array<ServiceInterval> {
  if (isTuesday(date)) return [];

  const lunchStart = setTime(date, 11, 30);
  const lunchEnd = setTime(date, 14, 30);
  const dinnerStart = setTime(date, 17, 30);
  const dinnerEnd = isSaturday(date)
    ? setTime(date, 23, 30)
    : setTime(date, 23, 0);

  if (isSaturday(date)) {
    // Saturday: only dinner, no lunch
    return [{ start: dinnerStart, end: dinnerEnd }];
  }

  return [
    { start: lunchStart, end: lunchEnd },
    { start: dinnerStart, end: dinnerEnd },
  ];
}

export function getEarliestSelectableTime(
  currentTime: Date,
  currentDeliveryTime: number | null,
): Date {
  const earliest = new Date(currentTime);
  earliest.setMinutes(earliest.getMinutes() + (currentDeliveryTime ?? 30));
  earliest.setSeconds(0, 0);
  return earliest;
}

export function getNextOpeningTime(now: Ref<Date>): string | null {
  const currentDate = now.value;

  // Check if closed for holiday
  if (isClosedHoliday(currentDate)) {
    return "13.08."; // Based on your existing code
  }

  // Check today's intervals
  const todayIntervals = getServiceIntervals(currentDate);
  const currentTime = currentDate.getTime();

  // Find next opening today
  for (const interval of todayIntervals) {
    if (interval.start.getTime() > currentTime) {
      const hours = interval.start.getHours().toString().padStart(2, '0');
      const minutes = interval.start.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes} Uhr`;
    }
  }

  // Check tomorrow
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Try up to 7 days ahead to find next opening
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(tomorrow);
    checkDate.setDate(checkDate.getDate() + i);

    const intervals = getServiceIntervals(checkDate);
    if (intervals.length > 0) {
      const nextOpen = intervals[0].start;
      const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][nextOpen.getDay()];
      const hours = nextOpen.getHours().toString().padStart(2, '0');
      const minutes = nextOpen.getMinutes().toString().padStart(2, '0');

      if (i === 0) {
        return `morgen um ${hours}:${minutes} Uhr`;
      }
      return `${dayName} um ${hours}:${minutes} Uhr`;
    }
  }

  return null;
};

export function findActiveInterval(
  currentTime: Date,
  currentDeliveryTime: number | null,
): ServiceInterval | null {
  const intervals = getServiceIntervals(currentTime);
  const earliest = getEarliestSelectableTime(
    currentTime,
    currentDeliveryTime ?? 30,
  );

  if (intervals.length === 0) return null;

  const current = intervals.find(
    (interval) => earliest >= interval.start && earliest <= interval.end,
  );
  if (current) return current;

  return intervals.find((interval) => interval.start > earliest) ?? null;
}
