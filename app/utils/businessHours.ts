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

  // Try up to 60 days ahead to find next opening (covers long holiday periods)
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() + i);
    checkDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone issues

    // Skip holidays
    if (isClosedHoliday(checkDate)) continue;

    const intervals = getServiceIntervals(checkDate);
    if (intervals.length === 0) continue;

    // For today, check if there's still an opening coming
    if (i === 0) {
      for (const interval of intervals) {
        if (interval.start.getTime() > currentDate.getTime()) {
          const hours = interval.start.getHours().toString().padStart(2, "0");
          const minutes = interval.start
            .getMinutes()
            .toString()
            .padStart(2, "0");
          return `${hours}:${minutes} Uhr`;
        }
      }
      continue; // Today's openings have passed, check next days
    }

    const nextOpen = intervals[0].start;
    const day = nextOpen.getDate().toString().padStart(2, "0");
    const month = (nextOpen.getMonth() + 1).toString().padStart(2, "0");
    const dayName = [
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
    ][nextOpen.getDay()];
    const hours = nextOpen.getHours().toString().padStart(2, "0");
    const minutes = nextOpen.getMinutes().toString().padStart(2, "0");

    if (i === 1) {
      return `morgen um ${hours}:${minutes} Uhr`;
    }
    return `${dayName}, ${day}.${month}. um ${hours}:${minutes} Uhr`;
  }

  return null;
}

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
